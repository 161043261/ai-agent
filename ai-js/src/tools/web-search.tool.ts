import axios from 'axios';
import { BaseTool, ToolParameter } from './tool.interface';

/**
 * 网页搜索工具 - 使用 SearchAPI 进行百度搜索
 */
export class WebSearchTool extends BaseTool {
  name = 'searchWeb';
  description = 'Search for information from Baidu Search Engine';
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
    this.apiKey = apiKey || process.env.SEARCH_API_KEY || '';
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args.query as string;

    if (!query) {
      return 'Error: query parameter is required';
    }

    if (!this.apiKey) {
      return 'Error: SEARCH_API_KEY is not configured';
    }

    try {
      const response = await axios.get(this.searchApiUrl, {
        params: {
          q: query,
          api_key: this.apiKey,
          engine: 'baidu',
        },
        timeout: 30000,
      });

      const organicResults = response.data.organic_results || [];
      // 取前 5 条结果
      const topResults = organicResults.slice(0, 5);

      if (topResults.length === 0) {
        return 'No search results found';
      }

      // 格式化搜索结果
      const formattedResults = topResults.map((result: Record<string, unknown>, index: number) => ({
        position: index + 1,
        title: result.title,
        link: result.link,
        snippet: result.snippet,
      }));

      return JSON.stringify(formattedResults, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error searching Baidu: ${errorMessage}`;
    }
  }
}
