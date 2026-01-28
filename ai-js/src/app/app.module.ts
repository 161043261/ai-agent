import { Module } from '@nestjs/common';
import { LoveAppService } from './love-app.service';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { RagModule } from '../rag/rag.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [LlmModule, MemoryModule, RagModule, ToolsModule],
  providers: [LoveAppService],
  exports: [LoveAppService],
})
export class AppModule {}
