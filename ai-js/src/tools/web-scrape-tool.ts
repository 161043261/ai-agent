import axios from 'axios';
import { BaseTool, ToolParameter } from './base-tool';
import cheerio from 'cheerio';

export class WebScrapeTool extends BaseTool {
  name = WebScrapeTool.name;
  description = 'Scrape the content of a web page';
  parameters: ToolParameter[] = [
    {
      name: 'url',
      type: 'string',
      description: 'Url of the web page to scrape',
      required: true,
    },
  ];

  async execute(args: { url: string }): Promise<string> {
    const { url } = args;
    try {
      const response = await axios.get(url, {
        timeout: 30_000,
        maxRedirects: 5,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data } = response;
      if (typeof data !== 'string') {
        return JSON.stringify(data, null, 2);
      }
      try {
        const $ = cheerio.load(data);
        $('footer, header, iframe, nav, noscript, script, style').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return text;
      } catch {
        return data;
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const { status } = err.response ?? {};
        return `Error scraping web page, status: ${status}`;
      }
      const errMessage = err instanceof Error ? err.message : String(err);
      return `Error scraping web page: ${errMessage}`;
    }
  }
}
