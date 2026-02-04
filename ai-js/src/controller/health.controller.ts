import { Controller, Get } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Controller()
export class HealthController {
  constructor(private readonly llmService: LlmService) {}
  @Get('health')
  async health() {
    const provider = this.llmService.getProvider();
    const ollamaAvailable = await this.llmService.isOllamaAvailable();
    let ollamaModels: string[] = [];
    if (ollamaAvailable) {
      ollamaModels = await this.llmService.listOllamaModels();
    }
    return {
      provider,
      ollama: {
        available: ollamaAvailable,
        models: ollamaModels,
      },
    };
  }
}
