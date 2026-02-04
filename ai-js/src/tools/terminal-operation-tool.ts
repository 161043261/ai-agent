import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TerminalOperationTool extends StructuredTool {
  name = TerminalOperationTool.name;
  description = 'Execute a command in the terminal';
  schema = z.object({
    command: z.string().describe('Command to execute in the terminal'),
  });

  async _call(args: { command: string }): Promise<string> {
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
      console.error('Executing command error:', err);
      return 'Executing command error';
    }
  }
}
