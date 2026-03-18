#!/usr/bin/env node

import { initCommand } from './commands/index.js';

export function main(): void {
  const command = process.argv[2] ?? 'help';

  switch (command) {
    case 'init':
      void initCommand(process.argv.slice(3))
        .then(() => {
          console.log('\n✅ Initialization complete!');
          process.exit(0);
        })
        .catch((error: unknown) => {
          console.error('❌ Initialization failed:', error);
          process.exit(1);
        });
      return;
    default:
      console.log('ospb - OpenSpec Workflow Plugin CLI');
      console.log('');
      console.log('Commands:');
      console.log('  init    Initialize workflow in current project');
      process.exit(0);
  }
}

main()
