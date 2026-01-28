import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AdvisorModule } from '../advisor/advisor.module';

@Module({
  imports: [AdvisorModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
