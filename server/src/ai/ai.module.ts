import { Module } from '@nestjs/common';
// import { AiController } from "./ai.controller";
// import { AiService } from "./ai.service";
import { ChatModelService } from './model/chat-model.service';
import { RagService } from './rag/rag.service';
import { VectorStoreService } from './rag/vector-store.service';
import { McpClientService } from './mcp/mcp-client.service';
import { CodeQuestionTool } from './tools/code-question-tool';
import { ToolProviderService } from './tools/tool-provider.service';
import { SafeInputGuardrail } from './guardrail/safe-input-guardrail';
import { ChatMemoryService } from './memory/chat-memory.service';
import { ChatModelListenerService } from './listener/chat-model-listener.service';
import { StructuredOutputService } from './structured-output/structured-output.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    ChatModelService,
    RagService,
    VectorStoreService,
    McpClientService,
    CodeQuestionTool,
    ToolProviderService,
    SafeInputGuardrail,
    ChatMemoryService,
    ChatModelListenerService,
    StructuredOutputService,
  ],
  exports: [
    AiService,
    ChatModelListenerService,
    StructuredOutputService,
    ToolProviderService,
    VectorStoreService,
  ],
})
export class AiModule {}
