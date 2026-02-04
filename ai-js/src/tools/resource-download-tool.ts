import { join } from 'path';
import { BaseTool, ToolParameter } from './types';
import ensureDir from './ensure-dir';
import axios from 'axios';
import { writeFile } from 'fs/promises';

const OUTPUT_DIR = process.cwd() + '/tmp/download';

export class ResourceDownloadTool extends BaseTool {
  name = ResourceDownloadTool.name;
  description = 'Download resource from url';
  parameters: ToolParameter[] = [
    {
      name: 'url',
      type: 'string',
      description: 'Url of the resource to download',
      required: true,
    },
    {
      name: 'filename',
      type: 'string',
      description: 'Downloaded resource filename',
      required: true,
    },
  ];

  async execute(args: { url: string; filename: string }): Promise<string> {
    const { url, filename } = args;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      await ensureDir(OUTPUT_DIR);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 180_000,
      });
      await writeFile(filepath, response.data);
      return `Resource downloaded successfully to: ${filepath}`;
    } catch (err) {
      this.logger.error('Downloading resource error:', err);
      return 'Downloading resource error';
    }
  }
}
