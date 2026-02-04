import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AdvisorModule } from './advisor/advisor.module';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from './metics/metrics.module';
import { LlmModule } from './llm/llm.module';
import { MemoryModule } from './memory/memory.module';
import { ToolsModule } from './tools/tools.module';
import { RagModule } from './rag/rag.module';
import { AgentModule } from './agent/agent.module';
import { AiController } from './controller/ai.controller';
import { HealthController } from './controller/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MetricsModule,
    LlmModule,
    MemoryModule,
    ToolsModule,
    RagModule,
    AgentModule,
    AdvisorModule,
  ],
  controllers: [AiController, HealthController],
  providers: [AppService],
})
export class AppModule {}
