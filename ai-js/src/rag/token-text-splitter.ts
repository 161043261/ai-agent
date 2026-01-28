import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Document } from './vector-store.interface';

/**
 * Token 切词器配置
 */
export interface TokenTextSplitterConfig {
  /** 默认块大小（token 数） */
  defaultChunkSize?: number;
  /** 最小块大小 */
  minChunkSizeChars?: number;
  /** 最大块数量 */
  maxNumChunks?: number;
  /** 是否保留分隔符 */
  keepSeparator?: boolean;
  /** 块之间的重叠 token 数 */
  chunkOverlap?: number;
}

/**
 * 基于 Token 的文本切分器
 * 支持按 Token 数量智能切分文档，保持语义完整性
 */
export class TokenTextSplitter {
  private readonly logger = new Logger(TokenTextSplitter.name);
  private readonly config: Required<TokenTextSplitterConfig>;

  // 用于估算 token 数的平均字符数（中文约 1.5 字符/token，英文约 4 字符/token）
  private readonly avgCharsPerToken = 2.5;

  constructor(config: TokenTextSplitterConfig = {}) {
    this.config = {
      defaultChunkSize: config.defaultChunkSize ?? 200,
      minChunkSizeChars: config.minChunkSizeChars ?? 100,
      maxNumChunks: config.maxNumChunks ?? 5000,
      keepSeparator: config.keepSeparator ?? true,
      chunkOverlap: config.chunkOverlap ?? 50,
    };
  }

  /**
   * 估算文本的 token 数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：中文字符 + 英文单词
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const numbers = (text.match(/\d+/g) || []).length;

    // 中文约 1 字符 = 1 token，英文约 1 单词 = 1 token
    return chineseChars + englishWords + numbers;
  }

  /**
   * 按句子分割文本
   */
  private splitBySentences(text: string): string[] {
    // 支持中英文句子分隔符
    const sentencePattern = /([。！？.!?]+)/g;
    const parts = text.split(sentencePattern);
    const sentences: string[] = [];
    let current = '';

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(sentencePattern)) {
        current += parts[i];
        if (current.trim()) {
          sentences.push(current.trim());
        }
        current = '';
      } else {
        current += parts[i];
      }
    }

    if (current.trim()) {
      sentences.push(current.trim());
    }

    return sentences;
  }

  /**
   * 按段落分割文本
   */
  private splitByParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * 切分单个文档
   */
  splitDocument(doc: Document): Document[] {
    const content = doc.content;
    const chunks: Document[] = [];

    // 首先按段落分割
    const paragraphs = this.splitByParagraphs(content);

    let currentChunk = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      // 如果单个段落超过块大小，需要进一步切分
      if (paragraphTokens > this.config.defaultChunkSize) {
        // 先保存当前块
        if (currentChunk.trim()) {
          chunks.push(this.createChunkDocument(doc, currentChunk.trim(), chunks.length));
          currentChunk = '';
          currentTokens = 0;
        }

        // 按句子切分大段落
        const sentences = this.splitBySentences(paragraph);
        for (const sentence of sentences) {
          const sentenceTokens = this.estimateTokens(sentence);

          if (
            currentTokens + sentenceTokens > this.config.defaultChunkSize &&
            currentChunk.trim()
          ) {
            chunks.push(this.createChunkDocument(doc, currentChunk.trim(), chunks.length));

            // 添加重叠部分
            if (this.config.chunkOverlap > 0) {
              const overlapText = this.getOverlapText(currentChunk, this.config.chunkOverlap);
              currentChunk = overlapText + ' ' + sentence;
              currentTokens = this.estimateTokens(currentChunk);
            } else {
              currentChunk = sentence;
              currentTokens = sentenceTokens;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else if (currentTokens + paragraphTokens > this.config.defaultChunkSize) {
        // 当前块已满，保存并开始新块
        if (currentChunk.trim()) {
          chunks.push(this.createChunkDocument(doc, currentChunk.trim(), chunks.length));
        }

        // 添加重叠
        if (this.config.chunkOverlap > 0) {
          const overlapText = this.getOverlapText(currentChunk, this.config.chunkOverlap);
          currentChunk = overlapText + '\n\n' + paragraph;
          currentTokens = this.estimateTokens(currentChunk);
        } else {
          currentChunk = paragraph;
          currentTokens = paragraphTokens;
        }
      } else {
        // 继续添加到当前块
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }

      // 检查块数量限制
      if (chunks.length >= this.config.maxNumChunks) {
        this.logger.warn(`Reached max chunks limit: ${this.config.maxNumChunks}`);
        break;
      }
    }

    // 保存最后一个块
    if (currentChunk.trim() && chunks.length < this.config.maxNumChunks) {
      chunks.push(this.createChunkDocument(doc, currentChunk.trim(), chunks.length));
    }

    this.logger.log(`Split document ${doc.id} into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * 获取重叠文本
   */
  private getOverlapText(text: string, overlapTokens: number): string {
    const targetChars = overlapTokens * this.avgCharsPerToken;
    if (text.length <= targetChars) {
      return text;
    }
    return text.slice(-Math.floor(targetChars));
  }

  /**
   * 创建块文档
   */
  private createChunkDocument(parentDoc: Document, content: string, chunkIndex: number): Document {
    return {
      id: uuidv4(),
      content,
      metadata: {
        ...parentDoc.metadata,
        parentId: parentDoc.id,
        chunkIndex,
        tokenCount: this.estimateTokens(content),
      },
    };
  }

  /**
   * 批量切分文档
   */
  splitDocuments(documents: Document[]): Document[] {
    const allChunks: Document[] = [];
    for (const doc of documents) {
      const chunks = this.splitDocument(doc);
      allChunks.push(...chunks);
    }
    return allChunks;
  }

  /**
   * 自定义配置切分
   */
  splitCustomized(
    documents: Document[],
    chunkSize: number = 200,
    chunkOverlap: number = 100,
    minChunkSizeChars: number = 10,
    maxNumChunks: number = 5000,
  ): Document[] {
    const customSplitter = new TokenTextSplitter({
      defaultChunkSize: chunkSize,
      chunkOverlap,
      minChunkSizeChars,
      maxNumChunks,
      keepSeparator: true,
    });

    return customSplitter.splitDocuments(documents);
  }
}
