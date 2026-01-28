import { Module, Global } from '@nestjs/common';
import { LoggerAdvisor, ReReadingAdvisor, AdvisorChain } from './advisor';

@Global()
@Module({
  providers: [LoggerAdvisor, ReReadingAdvisor, AdvisorChain],
  exports: [LoggerAdvisor, ReReadingAdvisor, AdvisorChain],
})
export class AdvisorModule {}
