import { Injectable, Logger } from '@nestjs/common';
import { StructuredTool } from '@langchain/core/tools';
import { ToolExecutor } from './types';
import { ReadFileTool, WriteFileTool } from './file-operation-tool';
import { WebScrapeTool } from './web-scrape-tool';
import { ResourceDownloadTool } from './resource-download-tool';
import { TerminalOperationTool } from './terminal-operation-tool';
import { TerminateTool } from './terminate-tool';
import { PdfGenerateTool } from './pdf-generation';

@Injectable()
export class ToolsService implements ToolExecutor {
  private readonly logger = new Logger(ToolsService.name);
  private readonly tools = new Map<string, StructuredTool>();

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await tool.invoke(args);
      this.logger.log(`Tool ${toolName} execution result: ${result}`);
      return JSON.stringify(result);
    } catch (err) {
      this.logger.error(`Error executing tool ${toolName}, error:`, err);
      return `Error executing tool ${toolName}`;
    }
  }

  private registerTools() {
    const toolInstances: StructuredTool[] = [
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

  getAllTools(): StructuredTool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string) {
    return this.tools.get(name);
  }
}
