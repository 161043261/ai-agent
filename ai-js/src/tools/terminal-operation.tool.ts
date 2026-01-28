import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool, ToolParameter } from './tool.interface';

const execAsync = promisify(exec);

/**
 * 终端操作工具
 */
export class TerminalOperationTool extends BaseTool {
  name = 'executeTerminalCommand';
  description = 'Execute a command in the terminal';
  parameters: ToolParameter[] = [
    {
      name: 'command',
      type: 'string',
      description: 'Command to execute in the terminal',
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<string> {
    const command = args.command as string;

    try {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellFlag = isWindows ? '/c' : '-c';

      const { stdout, stderr } = await execAsync(command, {
        shell,
        timeout: 30000,
      });

      if (stderr) {
        return `Command output:\n${stdout}\nErrors:\n${stderr}`;
      }
      return stdout || 'Command executed successfully';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error executing command: ${errorMessage}`;
    }
  }
}
