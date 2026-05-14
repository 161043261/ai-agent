import type { AiAgent } from "./agent";
import { getAiModelFactory } from "./factory";
import type { ModelType } from "./model";

class AiAgentManager {
  private username2sessionId2agent: Map<string, Map<string, AiAgent>> =
    new Map();

  getOrCreateAiAgent(
    username: string,
    sessionId: string,
    modelType: ModelType,
    config: Record<string, unknown>,
  ): AiAgent {
    let sessionId2agent = this.username2sessionId2agent.get(username);
    if (!sessionId2agent) {
      sessionId2agent = new Map();
      this.username2sessionId2agent.set(username, sessionId2agent);
    }

    const factory = getAiModelFactory();
    let agent = sessionId2agent.get(sessionId);
    if (agent) {
      if (agent.getModelType() !== modelType) {
        agent.setModel(factory.createAiModel(modelType, config));
      }
      return agent;
    }

    agent = factory.createAiAgent(modelType, sessionId, config);
    sessionId2agent.set(sessionId, agent);
    return agent;
  }

  getAiAgent(username: string, sessionId: string): AiAgent | undefined {
    const sessionId2agent = this.username2sessionId2agent.get(username);
    if (!sessionId2agent) return undefined;
    return sessionId2agent.get(sessionId);
  }

  removeAiAgent(username: string, sessionId: string): void {
    const sessionId2agent = this.username2sessionId2agent.get(username);
    if (!sessionId2agent) return;
    sessionId2agent.delete(sessionId);
    if (sessionId2agent.size === 0) {
      this.username2sessionId2agent.delete(username);
    }
  }

  getUserAllSessionIds(username: string): string[] {
    const sessionId2agent = this.username2sessionId2agent.get(username);
    if (!sessionId2agent) return [];
    return Array.from(sessionId2agent.keys());
  }
}

let managerInstance: AiAgentManager | null = null;

export function getAiAgentManager(): AiAgentManager {
  if (!managerInstance) {
    managerInstance = new AiAgentManager();
  }
  return managerInstance;
}
