import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import type { Message } from "../model/message";

export function toAiMessages(messages: Message[]): BaseMessage[] {
  return messages.map((m) => {
    if (m.is_user) {
      return new HumanMessage(m.content);
    }
    return new AIMessage(m.content);
  });
}
