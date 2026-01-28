import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmService } from '../llm/llm.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly llmService: LlmService) {}

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  async health(): Promise<{
    status: string;
    timestamp: string;
    llm: {
      provider: string;
      available: boolean;
      models?: string[];
    };
  }> {
    const provider = this.llmService.getProvider();
    let available = true;
    let models: string[] | undefined;

    if (provider === 'ollama') {
      available = await this.llmService.isOllamaAvailable();
      if (available) {
        models = await this.llmService.listOllamaModels();
      }
    }

    return {
      status: available ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      llm: {
        provider,
        available,
        models,
      },
    };
  }
}
