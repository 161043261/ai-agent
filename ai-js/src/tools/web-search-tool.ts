import axios from 'axios';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class WebSearchTool extends StructuredTool {
  name = WebSearchTool.name;
  description = 'Search for information from web search engine';
  schema = z.object({
    query: z.string().describe('Search query keyword'),
  });

  private readonly searchApiUrl = 'https://www.searchapi.io/api/v1/search';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? process.env.SEARCH_API_KEY ?? '';
  }

  async _call(args: { query: string }): Promise<string> {
    const { query } = args;
    if (!query) {
      return 'Query parameter is required';
    }
    if (!this.apiKey) {
      return 'Api key is required';
    }
    try {
      const response = await axios.get<{ organic_results: string[] }>(
        this.searchApiUrl,
        {
          params: {
            q: query,
            api_key: this.apiKey,
            engine: 'google',
          },
          timeout: 30_000,
        },
      );
      const { organic_results: originalResults } = response.data;
      const topResults = originalResults.slice(0, 5);
      return JSON.stringify(topResults, null, 2);
    } catch (err) {
      console.error('Searching web error:', err);
      return 'Searching web error';
    }
  }
}
