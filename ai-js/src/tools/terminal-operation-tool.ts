import { BaseTool, ToolParameter } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TerminalOperationTool extends BaseTool {
  name = TerminalOperationTool.name;
  description = 'Execute a command in the terminal';
  parameters: ToolParameter[] = [
    {
      name: 'command',
      type: 'string',
      description: 'Command to execute in the terminal',
      required: true,
    },
  ];

  async execute(args: { command: string }): Promise<string> {
    const { command } = args;
    try {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'pwsh' : '/bin/bash';
      const { stdout, stderr } = await execAsync(command, {
        shell,
        timeout: 180_000,
      });
      if (stderr) {
        return `Command execution failed: ${stderr}`;
      }
      return stdout;
    } catch (err) {
      this.logger.error('Executing command error:', err);
      return 'Executing command error';
    }
  }
}
