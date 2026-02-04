import { Injectable, Logger } from '@nestjs/common';
import { ToolsService } from '../tools/tools.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { StructuredTool } from '@langchain/core/tools';
import { CodeManus } from './code-manus';
import { ToolExecutor } from '../tools/types';
import { Observable } from 'rxjs';

const callTool = async (
  tool: StructuredTool,
  args: Record<string, unknown>,
): Promise<[ok: boolean, err: string, result: string]> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await tool.invoke(args);
    return [true, '', JSON.stringify(result)];
  } catch (err) {
    return [false, err instanceof Error ? err.message : String(err), ''];
  }
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  constructor(
    private readonly toolsService: ToolsService,
    private readonly llmService: LlmService,
    private readonly ragService: RagService,
  ) {}

  createCodeManus(ragContext = ''): CodeManus {
    const allTools = this.toolsService.getAllTools();
    const combinedExecutor: ToolExecutor = {
      execute: async (
        toolName: string,
        args: Record<string, unknown>,
      ): Promise<string> => {
        const tool = allTools.find((item) => item.name === toolName);
        if (tool) {
          const [ok, err, result] = await callTool(tool, args);
          return ok ? result : `Executing tool error: ${err}`;
        }
        return `Tool ${toolName} not found`;
      },
    };
    return new CodeManus(
      allTools,
      combinedExecutor,
      this.llmService.getChatModel(),
      ragContext,
    );
  }

  async runCodeManus(message: string): Promise<string> {
    const ragContext = await this.ragService.retrieveAsContext(message);
    const codeManus = this.createCodeManus(ragContext);
    return codeManus.run(message);
  }

  runCodeManusStream(message: string): Observable<string> {
    return new Observable((subscriber) => {
      this.ragService
        .retrieveAsContext(message)
        .then((ragContext) => {
          const codeManus = this.createCodeManus(ragContext);
          codeManus.runStream(message).subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => {
          this.logger.error('Run code manus stream error:', err);
        });
    });
  }
}
