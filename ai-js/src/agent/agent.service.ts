import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { YuManus } from './yu-manus';
import { ToolsService } from '../tools/tools.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { Tool } from '../tools/tool.interface';

/**
 * 可执行工具接口
 */
interface ExecutableTool extends Tool {
  execute(args: Record<string, unknown>): Promise<string>;
}

@Injectable()
export class AgentService {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly llmService: LlmService,
    private readonly ragService: RagService,
  ) {}

  /**
   * 创建 YuManus 智能体实例
   * @param additionalTools 额外的工具 (如 MCP 工具)，可以是 BaseTool 或 ExecutableTool
   * @param ragContext RAG 检索到的上下文
   */
  createYuManus(additionalTools: ExecutableTool[] = [], ragContext?: string): YuManus {
    const baseTools = this.toolsService.getAllTools();
    const additionalToolDefs = additionalTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    const allTools = [...baseTools, ...additionalToolDefs];

    // 创建组合执行器
    const combinedExecutor = {
      execute: async (toolName: string, args: string): Promise<string> => {
        // 先检查额外工具
        const additionalTool = additionalTools.find((t) => t.name === toolName);
        if (additionalTool) {
          try {
            const parsedArgs = JSON.parse(args || '{}');
            return additionalTool.execute(parsedArgs);
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        // 使用默认工具服务
        return this.toolsService.execute(toolName, args);
      },
    };

    return new YuManus(allTools, combinedExecutor, this.llmService.getChatModel(), ragContext);
  }

  /**
   * 运行 Manus 智能体 (同步, 带 RAG)
   */
  async runManus(message: string, additionalTools: ExecutableTool[] = []): Promise<string> {
    // 从 RAG 知识库获取相关上下文
    const ragContext = await this.ragService.buildContext(message);
    const manus = this.createYuManus(additionalTools, ragContext);
    return manus.run(message);
  }

  /**
   * 运行 Manus 智能体 (流式, 带 RAG)
   */
  runManusStream(message: string, additionalTools: ExecutableTool[] = []): Observable<string> {
    return new Observable((subscriber) => {
      this.ragService
        .buildContext(message)
        .then((ragContext) => {
          const manus = this.createYuManus(additionalTools, ragContext);
          manus.runStream(message).subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));
    });
  }
}
