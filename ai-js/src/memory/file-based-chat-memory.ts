import { mkdir, access, writeFile, readFile, unlink } from 'fs/promises';
import { BaseMessage } from '@langchain/core/messages';
import { ChatMemory } from './chat-memory';
import { join } from 'path';
import { Logger } from '@nestjs/common';

export class FileBasedChatMemory implements ChatMemory {
  private readonly logger = new Logger(FileBasedChatMemory.name);

  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private async ensureDir() {
    await mkdir(this.baseDir, { recursive: true });
    const gitignorePath = join(this.baseDir, '.gitignore');
    try {
      await access(gitignorePath);
    } catch {
      await writeFile(gitignorePath, '*', 'utf-8');
    }
  }

  private getFilepath(chatId: string) {
    return join(this.baseDir, `${chatId}.json`);
  }

  async add(chatId: string, messages: BaseMessage[]) {
    await this.ensureDir();
    const history = await this.get(chatId);
    const newHistory = [...history, ...messages];
    await this.save(chatId, newHistory);
  }

  async get(chatId: string): Promise<BaseMessage[]> {
    const filepath = this.getFilepath(chatId);
    try {
      const content = await readFile(filepath, 'utf-8');
      return JSON.parse(content) as BaseMessage[];
    } catch (err) {
      this.logger.log(`Read content from ${filepath} error:`, err);
      return [];
    }
  }

  async clear(chatId: string) {
    const filepath = this.getFilepath(chatId);
    try {
      await unlink(filepath);
    } catch (err) {
      this.logger.log(`Remove file ${filepath} error:`, err);
    }
  }

  private async save(chatId: string, messages: BaseMessage[]) {
    await this.ensureDir();
    const filepath = this.getFilepath(chatId);
    await writeFile(filepath, JSON.stringify(messages), 'utf-8');
  }
}
