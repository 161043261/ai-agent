import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseTool, ToolParameter } from './tool.interface';

const FILE_DIR = process.cwd() + '/tmp/file';

/**
 * 文件读取工具
 */
export class ReadFileTool extends BaseTool {
  name = 'readFile';
  description = 'Read content from a file';
  parameters: ToolParameter[] = [
    {
      name: 'fileName',
      type: 'string',
      description: 'Name of a file to read',
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<string> {
    const fileName = args.fileName as string;
    const filePath = path.join(FILE_DIR, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error reading file: ${errorMessage}`;
    }
  }
}

/**
 * 文件写入工具
 */
export class WriteFileTool extends BaseTool {
  name = 'writeFile';
  description = 'Write content to a file';
  parameters: ToolParameter[] = [
    {
      name: 'fileName',
      type: 'string',
      description: 'Name of the file to write',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write to the file',
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<string> {
    const fileName = args.fileName as string;
    const content = args.content as string;
    const filePath = path.join(FILE_DIR, fileName);

    try {
      // 创建目录
      await fs.mkdir(FILE_DIR, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return `File written successfully to: ${filePath}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error writing to file: ${errorMessage}`;
    }
  }
}
