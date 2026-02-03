import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolExecutor, BaseTool } from './base-tool';
import { ReadFileTool, WriteFileTool } from './file-operation-tool';
import { WebScrapeTool } from './web-scrape-tool';
import { ResourceDownloadTool } from './resource-download-tool';
import { TerminalOperationTool } from './terminal-operation-tool';
import { TerminateTool } from './terminate-tool';
import { PdfGenerateTool } from './pdf-generation';

@Injectable()
export class ToolsService implements ToolExecutor {
  private readonly logger = new Logger(ToolsService.name);
  private readonly tools = new Map<string, BaseTool>();
  constructor() {
    this.registerTools();
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const tool = this.getTool(toolName);
    if (!tool) {
      return `Unknown tool: ${toolName}`;
    }
    try {
      this.logger.log(
        `Executing tool ${toolName} with args: ${JSON.stringify(args)}`,
      );
      const result = await tool.execute(args);
      this.logger.log(`Tool ${toolName} execution result: ${result}`);
      return result;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error executing tool ${toolName}, error: ${errMessage}`,
      );
      return `Error executing tool ${toolName}, error: ${errMessage}`;
    }
  }

  private registerTools() {
    const toolInstances: BaseTool[] = [
      new ReadFileTool(),
      new WriteFileTool(),
      new WebScrapeTool(),
      // new WebSearchTool(),
      new ResourceDownloadTool(),
      new TerminalOperationTool(),
      new PdfGenerateTool(),
      new TerminateTool(),
    ];
    for (const tool of toolInstances) {
      this.tools.set(tool.name, tool);
      this.logger.log(`Tool ${tool.name} registered`);
    }
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map((item) => ({
      name: item.name,
      description: item.description,
      parameters: item.parameters,
    }));
  }

  getTool(name: string) {
    return this.tools.get(name);
  }
}
