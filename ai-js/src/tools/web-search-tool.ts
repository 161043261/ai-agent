import axios from 'axios';
import { BaseTool, ToolParameter } from './types';

export class WebSearchTool extends BaseTool {
  name = WebSearchTool.name;
  description = 'Search for information from web search engine';
  parameters: ToolParameter[] = [
    {
      name: 'query',
      type: 'string',
      description: 'Search query keyword',
      required: true,
    },
  ];

  private readonly searchApiUrl = 'https://www.searchapi.io/api/v1/search';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? process.env.SEARCH_API_KEY ?? '';
  }

  async execute(args: { query: string }): Promise<string> {
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
      this.logger.log('Searching web error:', err);
      return 'Searching web error';
    }
  }
}
