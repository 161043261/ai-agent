import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ToolsModule } from '../tools/tools.module';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [ToolsModule, LlmModule, RagModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
