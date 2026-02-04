import axios from 'axios';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import cheerio from 'cheerio';

export class WebScrapeTool extends StructuredTool {
  name = WebScrapeTool.name;
  description = 'Scrape the content of a web page';
  schema = z.object({
    url: z.string().describe('Url of the web page to scrape'),
  });

  async _call(args: { url: string }): Promise<string> {
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
      console.error('Scraping web error:', err);
      return 'Scraping web page error';
    }
  }
}
