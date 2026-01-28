import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolExecutor, BaseTool } from './tool.interface';
import { ReadFileTool, WriteFileTool } from './file-operation.tool';
import { WebScrapingTool } from './web-scraping.tool';
import { WebSearchTool } from './web-search.tool';
import { ResourceDownloadTool } from './resource-download.tool';
import { TerminalOperationTool } from './terminal-operation.tool';
import { PDFGenerationTool } from './pdf-generation.tool';
import { TerminateTool } from './terminate.tool';

@Injectable()
export class ToolsService implements ToolExecutor {
  private readonly logger = new Logger(ToolsService.name);
  private readonly tools: Map<string, BaseTool> = new Map();

  constructor() {
    this.registerTools();
  }

  /**
   * 注册所有工具
   */
  private registerTools(): void {
    const toolInstances: BaseTool[] = [
      new ReadFileTool(),
      new WriteFileTool(),
      new WebScrapingTool(),
      new WebSearchTool(),
      new ResourceDownloadTool(),
      new TerminalOperationTool(),
      new PDFGenerationTool(),
      new TerminateTool(),
    ];

    for (const tool of toolInstances) {
      this.tools.set(tool.name, tool);
      this.logger.log(`Registered tool: ${tool.name}`);
    }
  }

  /**
   * 获取所有工具定义
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * 获取工具
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 执行工具
   */
  async execute(toolName: string, argsJson: string): Promise<string> {
    const tool = this.getTool(toolName);
    if (!tool) {
      return `Unknown tool: ${toolName}`;
    }

    try {
      const args = JSON.parse(argsJson || '{}');
      this.logger.log(`Executing tool ${toolName} with args: ${JSON.stringify(args)}`);
      const result = await tool.execute(args);
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      this.logger.log(`Tool ${toolName} result: ${resultStr.substring(0, 200)}...`);
      return resultStr;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error executing tool ${toolName}: ${errorMessage}`);
      return `Error executing tool: ${errorMessage}`;
    }
  }
}
