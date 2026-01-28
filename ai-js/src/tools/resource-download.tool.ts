import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { BaseTool, ToolParameter } from './tool.interface';

const DOWNLOAD_DIR = process.cwd() + '/tmp/download';

/**
 * 资源下载工具
 */
export class ResourceDownloadTool extends BaseTool {
  name = 'downloadResource';
  description = 'Download a resource from a given URL';
  parameters: ToolParameter[] = [
    {
      name: 'url',
      type: 'string',
      description: 'URL of the resource to download',
      required: true,
    },
    {
      name: 'fileName',
      type: 'string',
      description: 'Name of the file to save the downloaded resource',
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args.url as string;
    const fileName = args.fileName as string;
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    try {
      // 创建目录
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

      // 下载文件
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      await fs.writeFile(filePath, response.data);
      return `Resource downloaded successfully to: ${filePath}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error downloading resource: ${errorMessage}`;
    }
  }
}
