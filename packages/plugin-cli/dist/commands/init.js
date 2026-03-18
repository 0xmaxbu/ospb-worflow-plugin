import { exec } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
const CONFIG_PATH = '.opencode/opencode.json';
async function isCommandAvailable(command) {
    try {
        await execAsync(`${command} --version`);
        return true;
    }
    catch {
        return false;
    }
}
function prompt(question) {
    return new Promise((resolve) => {
        process.stdout.write(question + ': ');
        process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}
async function createConfig(options) {
    const existingConfig = await loadExistingConfig();
    const existingPlugins = Array.isArray(existingConfig.plugins)
        ? existingConfig.plugins
        : [];
    const config = {
        ...existingConfig,
        $schema: 'https://opencode.ai/schema.json',
        plugins: ['@ospb/plugin-core', ...existingPlugins],
        settings: {
            ...(existingConfig.settings || {}),
            workflowGuard: {
                enabled: true,
                requireVerification: options.requireVerification ?? true,
                blockedCommands: options.blockedCommands ?? [
                    'git push --force',
                    'rm -rf /',
                ],
            },
        },
    };
    await mkdir(dirname(CONFIG_PATH), { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
async function loadExistingConfig() {
    try {
        const content = await readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return {};
    }
}
async function runInteractiveWizard() {
    console.log('\n📋 Configuration Wizard');
    console.log('----------------------');
    const requireVerification = await prompt('Require task verification before claiming new tasks? (y/N)');
    const requireVerificationBool = ['y', 'Y', 'yes', 'Yes'].includes(requireVerification);
    const blockedInput = await prompt('Additional blocked commands (comma-separated, Enter for defaults)');
    const blockedCommands = blockedInput
        ? blockedInput.split(',').map(s => s.trim()).filter(Boolean)
        : ['git push --force', 'rm -rf /'];
    return {
        requireVerification: requireVerificationBool,
        blockedCommands,
        skipPrompts: false,
    };
}
export async function initCommand(args) {
    const [openspecAvailable, beadsAvailable] = await Promise.all([
        isCommandAvailable('openspec'),
        isCommandAvailable('bd'),
    ]);
    console.log('🔍 Checking tools...');
    console.log(`  openspec: ${openspecAvailable ? '✅' : '❌'}`);
    console.log(`  beads: ${beadsAvailable ? '✅' : '❌'}`);
    if (!openspecAvailable || !beadsAvailable) {
        console.log('\n⚠️  Warning: Some required tools are not available.');
        console.log('  Please install them to enable full workflow functionality.');
        console.log('  - openspec: https://opencode.ai/docs/cli');
        console.log('  - beads: Run `bd doctor` in OpenCode');
    }
    const skipPrompts = args.includes('--yes') || args.includes('-y');
    let options;
    if (skipPrompts) {
        options = { requireVerification: true, blockedCommands: ['git push --force', 'rm -rf /'] };
        console.log('\n⚡ Running in non-interactive mode with defaults');
    }
    else {
        options = await runInteractiveWizard();
    }
    console.log('\n📝 Creating configuration...');
    await createConfig(options);
    console.log(`\n✅ Configuration saved to ${CONFIG_PATH}`);
    console.log('\n📖 Next steps:');
    console.log('  1. Restart OpenCode to load the plugin');
    console.log('  2. Run `ospb init --help` for more commands');
    return {
        success: true,
        openspecAvailable,
        beadsAvailable,
        configCreated: true,
        options,
    };
}
