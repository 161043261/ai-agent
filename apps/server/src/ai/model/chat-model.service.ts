import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class ChatModelService implements OnModuleInit {
  private readonly logger = new Logger(ChatModelService.name);
  private chatModel: BaseChatModel;
  private streamingChatModel: BaseChatModel;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'ollama');
    if (provider === 'ollama') {
      this.initOllama();
    } else {
      this.initDashScope();
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
    this.chatModel = new ChatOllama({
      baseUrl,
      model: modelName,
    });
    this.streamingChatModel = new ChatOllama({
      baseUrl,
      model: modelName,
      streaming: true,
    });
    this.logger.log(`Ollama model initialized: ${modelName} at ${baseUrl}`);
  }

  private initDashScope() {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    const modelName = this.configService.get<string>(
      'DASHSCOPE_CHAT_MODEL',
      'deepseek-v3.2',
    );
    if (!apiKey) {
      this.logger.error(
        'DashScope API key is empty: https://bailian.console.aliyun.com/cn-beijing/tab=home?tab=app#/api-key',
      );
      // return;
    }
    const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      configuration: { baseURL: baseUrl },
    });
    this.streamingChatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      streaming: true,
      configuration: { baseURL: baseUrl },
    });
    this.logger.log(`DashScope model initialized: ${modelName} at ${baseUrl}`);
  }

  getChatModel() {
    return this.chatModel;
  }

  getStreamingChatModel() {
    return this.streamingChatModel;
  }
}
