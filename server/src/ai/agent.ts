import { logger } from "../config";
import { saveMessage } from "../db/cache";
import type { Message } from "../model/message";
import { toAiMessages } from "../utils/ai-message";
import type { AiModel, StreamCallback } from "./model";

export class AiAgent {
  private messages: Message[] = [];
  private model: AiModel;
  public sessionId: string;

  constructor(model: AiModel, sessionId: string) {
    this.model = model;
    this.sessionId = sessionId;
  }

  getModelType(): string {
    return this.model.getModelType();
  }

  setModel(model: AiModel) {
    this.model = model;
  }

  async response(username: string, userMessage: string): Promise<Message> {
    this.addMessage(userMessage, username, true, true);
    const aiMessages = toAiMessages(this.messages);
    const content = await this.model.response(aiMessages);
    const aiMessage: Message = {
      session_id: this.sessionId,
      username,
      content,
      is_user: false,
    };
    this.addMessage(content, username, false, true);
    return aiMessage;
  }

  async responseStream(
    username: string,
    userMessage: string,
    cb: StreamCallback,
  ): Promise<Message> {
    this.addMessage(userMessage, username, true, true);
    const aiMessages = toAiMessages(this.messages);
    const content = await this.model.responseStream(aiMessages, cb);
    const aiMessage: Message = {
      session_id: this.sessionId,
      username,
      content,
      is_user: false,
    };
    this.addMessage(content, username, false, true);
    return aiMessage;
  }

  addMessage(
    content: string,
    username: string,
    isUser: boolean,
    shouldSave: boolean,
  ): void {
    const msg: Message = {
      session_id: this.sessionId,
      content,
      username,
      is_user: isUser,
    };
    this.messages.push(msg);
    if (shouldSave) {
      saveMessage(this.sessionId, content, username, isUser).catch((err) => {
        logger.error({ err }, "Save message error");
      });
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }
}
