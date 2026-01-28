import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseTool, ToolParameter } from './tool.interface';

/**
 * 网页抓取工具
 */
export class WebScrapingTool extends BaseTool {
  name = 'scrapeWebPage';
  description = 'Scrape the content of a web page';
  parameters: ToolParameter[] = [
    {
      name: 'url',
      type: 'string',
      description: 'URL of the web page to scrape',
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args.url as string;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      // 返回内容 (确保是字符串)
      const data = response.data;
      if (typeof data !== 'string') {
        return JSON.stringify(data, null, 2);
      }

      // 尝试提取正文内容，减少返回数据量
      try {
        const $ = cheerio.load(data);
        // 移除脚本和样式
        $('script, style, noscript, iframe, nav, footer, header').remove();
        // 提取正文
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        // 限制长度
        return text.substring(0, 8000);
      } catch {
        // 如果解析失败，返回原始 HTML（截取）
        return data.substring(0, 8000);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          return `Error: 网站拒绝访问 (403 Forbidden)，该网站有反爬虫保护`;
        } else if (status === 404) {
          return `Error: 页面不存在 (404 Not Found)`;
        } else if (status === 429) {
          return `Error: 请求过于频繁 (429 Too Many Requests)`;
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error scraping web page: ${errorMessage}`;
    }
  }
}
