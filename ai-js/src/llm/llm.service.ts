import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatModel } from './chat-model.interface';
import { DashScopeChatModel } from './dashscope-chat-model';
import { OllamaChatModel } from './ollama-chat-model';
import { AdvisedChatModel } from './advised-chat-model';
import { AdvisorChain } from '../advisor/advisor';
import { LLMProvider } from '../config';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private chatModel: ChatModel;
  private advisedChatModel: ChatModel | null = null;
  private ollamaModel?: OllamaChatModel;
  private provider: LLMProvider;

  constructor(
    private configService: ConfigService,
    @Optional() private advisorChain?: AdvisorChain,
  ) {
    this.provider = (this.configService.get<string>('LLM_PROVIDER') as LLMProvider) || 'ollama';

    if (this.provider === 'ollama') {
      this.initOllama();
    } else {
      this.initDashScope();
    }

    // 如果有 AdvisorChain，创建增强的 ChatModel
    if (this.advisorChain) {
      this.advisedChatModel = new AdvisedChatModel(this.chatModel, this.advisorChain);
      this.logger.log('AdvisorChain enabled for ChatModel');
    }
  }

  private initOllama(): void {
    const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const model = this.configService.get<string>('OLLAMA_MODEL') || 'qwen2.5:7b';

    this.ollamaModel = new OllamaChatModel(model, baseUrl);
    this.chatModel = this.ollamaModel;
    this.logger.log(`LLM Service initialized with Ollama model: ${model} at ${baseUrl}`);
  }

  private initDashScope(): void {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    const model = this.configService.get<string>('DASHSCOPE_MODEL') || 'qwen-plus';

    if (!apiKey) {
      this.logger.warn('DASHSCOPE_API_KEY not configured');
    }

    this.chatModel = new DashScopeChatModel(apiKey, model);
    this.logger.log(`LLM Service initialized with DashScope model: ${model}`);
  }

  /**
   * 获取 ChatModel（不带 Advisor）
   */
  getChatModel(): ChatModel {
    return this.chatModel;
  }

  /**
   * 获取带 Advisor 增强的 ChatModel
   */
  getAdvisedChatModel(): ChatModel {
    return this.advisedChatModel || this.chatModel;
  }

  /**
   * 设置 AdvisorChain（用于延迟注入）
   */
  setAdvisorChain(advisorChain: AdvisorChain): void {
    this.advisorChain = advisorChain;
    this.advisedChatModel = new AdvisedChatModel(this.chatModel, advisorChain);
    this.logger.log('AdvisorChain set for ChatModel');
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * 获取 Ollama 模型实例 (可用于检查服务状态、列出模型等)
   */
  getOllamaModel(): OllamaChatModel | undefined {
    return this.ollamaModel;
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async isOllamaAvailable(): Promise<boolean> {
    if (!this.ollamaModel) {
      const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
      const tempModel = new OllamaChatModel('', baseUrl);
      return tempModel.isAvailable();
    }
    return this.ollamaModel.isAvailable();
  }

  /**
   * 列出 Ollama 可用模型
   */
  async listOllamaModels(): Promise<string[]> {
    if (!this.ollamaModel) {
      const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
      const tempModel = new OllamaChatModel('', baseUrl);
      return tempModel.listModels();
    }
    return this.ollamaModel.listModels();
  }
}
