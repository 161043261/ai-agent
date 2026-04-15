import { AiAgent } from "./agent";
import { AiModel, ModelType, OllamaModel, OllamaRagModel } from "./model";

export type AiModelCreator = (config: Record<string, unknown>) => AiModel;

export class AiModelFactory {
  private creators: Map<ModelType, AiModelCreator> = new Map();

  constructor() {
    this.creators.set(ModelType.OLLAMA_MODEL, () => new OllamaModel());
    this.creators.set(ModelType.OLLAMA_RAG_MODEL, (cfg) => {
      const username = String(cfg.username);
      if (!username) throw new Error("RAG model requires username");
      return new OllamaRagModel(username);
    });
  }

  public createAiModel(
    modelType: ModelType,
    config?: Record<string, unknown>,
  ): AiModel {
    const creator = this.creators.get(modelType);
    if (!creator) {
      throw new Error(`Unsupported model type: ${modelType}`);
    }
    return creator(config || {});
  }

  createAiAgent(
    modelType: ModelType,
    sessionId: string,
    config: Record<string, unknown>,
  ): AiAgent {
    const model = this.createAiModel(modelType, config);
    return new AiAgent(model, sessionId);
  }

  public registerModel(modelType: ModelType, creator: AiModelCreator): void {
    this.creators.set(modelType, creator);
  }
}

let factoryInstance: AiModelFactory | null = null;

export function getAiModelFactory(): AiModelFactory {
  if (!factoryInstance) {
    factoryInstance = new AiModelFactory();
  }
  return factoryInstance;
}
