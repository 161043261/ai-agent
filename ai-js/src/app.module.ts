import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent/agent.module';
import { ToolsModule } from './tools/tools.module';
import { AppModule as LoveAppModule } from './app/app.module';
import { RagModule } from './rag/rag.module';
import { LlmModule } from './llm/llm.module';
import { MemoryModule } from './memory/memory.module';
import { MetricsModule } from './metrics/metrics.module';
import { AdvisorModule } from './advisor/advisor.module';
import { McpModule } from './mcp/mcp.module';
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
    LoveAppModule,
    AdvisorModule,
    McpModule,
  ],
  controllers: [AiController, HealthController],
  providers: [],
})
export class AppModule {}
