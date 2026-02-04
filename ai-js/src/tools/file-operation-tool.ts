import { join } from 'path';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';
import ensureDir from './ensure-dir';

const OUTPUT_DIR = process.cwd() + '/tmp/file';

export class ReadFileTool extends StructuredTool {
  name = 'ReadFileTool';
  description = 'Read content from a file';
  schema = z.object({
    filename: z.string().describe('Name of the file to read'),
  });

  async _call(args: { filename: string }): Promise<string> {
    const { filename } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      const content = await readFile(filepath, 'utf-8');
      return content;
    } catch (err) {
      console.error('Reading file error:', err);
      return 'Reading file error';
    }
  }
}

export class WriteFileTool extends StructuredTool {
  name = 'WriteFileTool';
  description = 'Write content to a file';
  schema = z.object({
    filename: z.string().describe('Name of the file to write'),
    content: z.string().describe('Content to write to the file'),
  });

  async _call(args: { filename: string; content: string }): Promise<string> {
    const { filename, content } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      await ensureDir(OUTPUT_DIR);
      await writeFile(filepath, content, 'utf-8');
      return `File written successfully to: ${filepath}`;
    } catch (err) {
      console.error('Writing file error:', err);
      return 'Writing file error';
    }
  }
}
