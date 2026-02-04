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

  createCodeManus(
    additionalTools: StructuredTool[] = [],
    ragContext = '',
  ): CodeManus {
    const localTools = this.toolsService.getAllTools();
    const allTools = [...localTools, ...additionalTools];

    const combinedExecutor: ToolExecutor = {
      execute: async (
        toolName: string,
        args: Record<string, unknown>,
      ): Promise<string> => {
        let tool = additionalTools.find((item) => item.name === toolName);
        const aggregateError: string[] = [];
        if (tool) {
          const [ok, err, result] = await callTool(tool, args);
          if (ok) {
            return result;
          }
          aggregateError.push(err);
        }
        tool = localTools.find((item) => item.name === toolName);
        if (tool) {
          const [ok, err, result] = await callTool(tool, args);
          if (ok) {
            return result;
          }
          aggregateError.push(err);
        }
        return aggregateError.length
          ? `Executing tool error: ${aggregateError.join(',')}`
          : `Tool ${toolName} not found`;
      },
    };
    return new CodeManus(
      allTools,
      combinedExecutor,
      this.llmService.getChatModel(),
      ragContext,
    );
  }

  async runCodeManus(
    message: string,
    additionalTools: StructuredTool[] = [],
  ): Promise<string> {
    const ragContext = await this.ragService.retrieveAsContext(message);
    const codeManus = this.createCodeManus(additionalTools, ragContext);
    return codeManus.run(message);
  }

  runCodeManusStream(
    message: string,
    additionalTools: StructuredTool[] = [],
  ): Observable<string> {
    return new Observable((subscriber) => {
      this.ragService
        .retrieveAsContext(message)
        .then((ragContext) => {
          const codeManus = this.createCodeManus(additionalTools, ragContext);
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
