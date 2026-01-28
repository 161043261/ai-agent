import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
