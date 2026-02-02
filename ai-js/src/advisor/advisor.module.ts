import { Global, Module } from '@nestjs/common';
import {
  AdvisorChain,
  LoggerAdvisor,
  ReReadingAdvisor,
} from './advisors.service';

@Global()
@Module({
  providers: [LoggerAdvisor, ReReadingAdvisor, AdvisorChain],
  exports: [LoggerAdvisor, ReReadingAdvisor, AdvisorChain],
})
export class AdvisorModule {}
