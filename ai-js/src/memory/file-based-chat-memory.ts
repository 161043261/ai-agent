import * as fs from 'fs/promises';
import * as path from 'path';
import { Message } from '../agent/model/message.interface';
import { ChatMemory } from './chat-memory.interface';

/**
 * 基于文件持久化的对话记忆
 */
export class FileBasedChatMemory implements ChatMemory {
  private baseDir: string;

  constructor(dir: string) {
    this.baseDir = dir;
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // 目录已存在
    }
  }

  private getFilePath(conversationId: string): string {
    return path.join(this.baseDir, `${conversationId}.json`);
  }

  async add(conversationId: string, messages: Message[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.get(conversationId);
    const updated = [...existing, ...messages];
    await this.save(conversationId, updated);
  }

  async get(conversationId: string): Promise<Message[]> {
    const filePath = this.getFilePath(conversationId);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as Message[];
    } catch {
      return [];
    }
  }

  async clear(conversationId: string): Promise<void> {
    const filePath = this.getFilePath(conversationId);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在
    }
  }

  private async save(conversationId: string, messages: Message[]): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(conversationId);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
  }
}
