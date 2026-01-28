import axios from "axios";

const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

/**
 * 图片搜索工具 - 使用 Pexels API 搜索图片
 */
export class ImageSearchTool {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PEXELS_API_KEY || "";
  }

  /**
   * 搜索图片
   * @param query 搜索关键词
   * @returns 图片 URL 列表 (逗号分隔)
   */
  async searchImage(query: string): Promise<string> {
    if (!query) {
      return "Error: query parameter is required";
    }

    if (!this.apiKey) {
      return "Error: PEXELS_API_KEY is not configured";
    }

    try {
      const images = await this.searchMediumImages(query);
      return images.join(",");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error search image: ${errorMessage}`;
    }
  }

  /**
   * 搜索中等尺寸的图片
   * @param query 搜索关键词
   * @returns 中等尺寸图片 URL 数组
   */
  private async searchMediumImages(query: string): Promise<string[]> {
    const response = await axios.get<PexelsSearchResponse>(PEXELS_API_URL, {
      headers: {
        Authorization: this.apiKey,
      },
      params: {
        query,
        per_page: 10,
      },
      timeout: 30000,
    });

    const photos = response.data.photos || [];
    return photos.map((photo) => photo.src.medium);
  }
}

// 工具定义 (用于 MCP)
export const imageSearchToolDefinition = {
  name: "searchImage",
  description: "Search images from the web using Pexels API",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query keyword",
      },
    },
    required: ["query"],
  },
};
