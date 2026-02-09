import { Injectable, Logger } from '@nestjs/common';
import { ChatModelService } from '../model/chat-model.service';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

export interface Report {
  name: string;
  suggestionList: string[];
}

export const ReportSchema = z.object({
  name: z.string().describe('name'),
  suggestionList: z.array(z.string()).describe('suggestion list'),
});

@Injectable()
export class StructuredOutputService {
  private logger = new Logger(StructuredOutputService.name);

  constructor(private readonly chatModelService: ChatModelService) {}

  async chatForReport(userMessage: string, systemPrompt: string) {
    const chatModel = this.chatModelService.getChatModel();
    const structuredPrompt = `
请根据用户的问题指定学习计划;
必须以 JSON 格式返回, 包含以下字段:
- name: 学习计划的标题, 值是字符串
- suggestionList: 学习建议数组, 值是字符串数组
例:
{
  "name": "学习计划",
  "suggestionList": ["建议1", "建议2", "建议3"]
}
只返回 JSON, 不要返回其他内容
    `;
    const messages = [
      new SystemMessage(`${systemPrompt}\n${structuredPrompt}`),
      new HumanMessage(userMessage),
    ];
    try {
      const response = await chatModel.invoke(messages);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ReportSchema.parse(parsed);
      this.logger.log(`Generated report: ${validated.name}`);
      return validated;
    } catch (err) {
      this.logger.error(`Failed to generate report:`, err);
      // throw err;
      return {
        name: '学习计划',
        suggestionList: ['Internal Server Error'],
      };
    }
  }

  async parseStructuredOutput<T>(
    userMessage: string,
    systemPrompt: string,
    schema: z.ZodSchema<T>,
    formatInstructions: string,
  ): Promise<T> {
    const chatModel = this.chatModelService.getChatModel();
    const structuredPrompt = `
      ${systemPrompt};
      ${formatInstructions};
      只返回 JSON, 不要返回其他内容
    `;
    const messages = [
      new SystemMessage(structuredPrompt),
      new HumanMessage(userMessage),
    ];
    const response = await chatModel.invoke(messages);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }
}
