import { exec } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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
async function createConfig() {
    const config = {
        name: 'ospb-workflow-plugin',
        plugins: ['@ospb/plugin-core'],
        settings: {
            workflowGuard: {
                enabled: true,
                requireVerification: true,
            },
        },
    };
    await mkdir(dirname(CONFIG_PATH), { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
export async function initCommand(_args) {
    const [openspecAvailable, beadsAvailable] = await Promise.all([
        isCommandAvailable('openspec'),
        isCommandAvailable('bd'),
    ]);
    console.log('🔍 Checking tools...');
    console.log(`  openspec: ${openspecAvailable ? '✅' : '❌'}`);
    console.log(`  beads: ${beadsAvailable ? '✅' : '❌'}`);
    console.log('\n📝 Creating configuration...');
    await createConfig();
    return {
        success: true,
        openspecAvailable,
        beadsAvailable,
        configCreated: true,
    };
}
