import { Injectable, Logger, Optional } from '@nestjs/common';
import { ChatModel } from './chat-model';
import { ConfigService } from '@nestjs/config';
import { AdvisorChain } from '../advisor/advisors.service';
import { LlmProvider } from '../config';
import { AdvisedChatModel } from './advised-chat-model';
import { OllamaChatModel } from './ollama-chat-model';
import { DashscopeChatModel } from './dashscope-chat-model';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private chatModel: ChatModel;
  private llmProvider: LlmProvider;

  constructor(
    private configService: ConfigService,
    @Optional() private advisorChain?: AdvisorChain,
  ) {
    this.llmProvider = this.configService.get<LlmProvider>(
      'LLM_PROVIDER',
      'ollama',
    );
    if (this.llmProvider === 'ollama') {
      this.initOllama();
    } else {
      this.initDashscope();
    }
    if (this.advisorChain) {
      this.chatModel = new AdvisedChatModel(this.chatModel, this.advisorChain);
    }
  }

  private initOllama() {
    const baseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
    const modelName = this.configService.get<string>(
      'OLLAMA_MODEL',
      'qwen2.5:7b',
    );
    this.chatModel = new OllamaChatModel(modelName, baseUrl);
    this.logger.log(
      `LLM service initialized with ollama model: ${modelName} at ${baseUrl}`,
    );
  }

  private initDashscope() {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY', '');
    const modelName = this.configService.get<string>(
      'DASHSCOPE_MODEL',
      'qwen-plus',
    );
    this.chatModel = new DashscopeChatModel(apiKey, modelName);
    this.logger.log(
      `LLM service initialized with dashscope model: ${modelName}`,
    );
  }

  getChatModel() {
    return this.chatModel;
  }

  getProvider() {
    return this.llmProvider;
  }

  setAdvisorChain(advisorChain: AdvisorChain) {
    this.advisorChain = advisorChain;
  }

  async isOllamaAvailable() {
    if (this.llmProvider === 'dashscope') {
      const baseUrl = this.configService.get<string>(
        'OLLAMA_BASE_URL',
        'http://localhost:11434',
      );
      const tempChatModel = new OllamaChatModel('', baseUrl);
      return tempChatModel.isAvailable();
    }
    return (this.chatModel as OllamaChatModel).isAvailable();
  }

  async listOllamaModels() {
    if (this.llmProvider === 'dashscope') {
      const baseUrl = this.configService.get<string>(
        'OLLAMA_BASE_URL',
        'http://localhost:11434',
      );
      const tempChatModel = new OllamaChatModel('', baseUrl);
      return tempChatModel.listModels();
    }
    return (this.chatModel as OllamaChatModel).listModels();
  }
}
