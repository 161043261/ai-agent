import { join } from 'path';
import { BaseTool, ToolParameter } from './types';
import { readFile, writeFile } from 'fs/promises';
import ensureDir from './ensure-dir';

const OUTPUT_DIR = process.cwd() + '/tmp/file';

export class ReadFileTool extends BaseTool {
  name: string = ReadFileTool.name;
  description = 'Read content from a file';
  parameters: ToolParameter[] = [
    {
      name: 'filename',
      type: 'string',
      description: 'Name of the file to read',
      required: true,
    },
  ];

  async execute(args: { filename: string }): Promise<string> {
    const { filename } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      const content = await readFile(filepath, 'utf-8');
      return content;
    } catch (err) {
      this.logger.error('Reading file error:', err);
      return 'Reading file error';
    }
  }
}

export class WriteFileTool extends BaseTool {
  name = WriteFileTool.name;
  description = 'Write content to a file';
  parameters: ToolParameter[] = [
    {
      name: 'filename',
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

  async execute(args: { filename: string; content: string }): Promise<string> {
    const { filename, content } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      await ensureDir(OUTPUT_DIR);
      await writeFile(filepath, content, 'utf-8');
      return `File written successfully to: ${filepath}`;
    } catch (err) {
      this.logger.log('Writing file error:', err);
      return 'Writing file error';
    }
  }
}
