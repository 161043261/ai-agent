import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Document } from './vector-store.interface';

/**
 * 分割模式
 */
export enum SplitMode {
  /** 按字符数分割 */
  CHARACTER = 'character',
  /** 按Token数分割（估算） */
  TOKEN = 'token',
  /** 按句子分割 */
  SENTENCE = 'sentence',
  /** 按段落分割 */
  PARAGRAPH = 'paragraph',
  /** 递归分割（尝试保持语义完整性） */
  RECURSIVE = 'recursive',
}

/**
 * Token 文本分割器配置
 */
export interface TokenTextSplitterConfig {
  /** 分割模式 */
  mode?: SplitMode;
  /** 每个块的最大大小（字符数或token数） */
  chunkSize?: number;
  /** 块之间的重叠大小 */
  chunkOverlap?: number;
  /** 分隔符列表（用于递归分割） */
  separators?: string[];
  /** 是否保留分隔符 */
  keepSeparator?: boolean;
  /** Token 与字符的比例（用于估算） */
  tokenCharRatio?: number;
}

/**
 * Token 文本分割器
 * 支持多种分割策略，保持语义完整性
 */
export class TokenTextSplitter {
  private readonly logger = new Logger(TokenTextSplitter.name);
  private readonly config: Required<TokenTextSplitterConfig>;

  // 默认递归分割分隔符（按优先级排序）
  private static readonly DEFAULT_SEPARATORS = [
    '\n\n', // 段落
    '\n', // 换行
    '。', // 中文句号
    '！', // 中文感叹号
    '？', // 中文问号
    '；', // 中文分号
    '. ', // 英文句号
    '! ', // 英文感叹号
    '? ', // 英文问号
    '; ', // 英文分号
    ', ', // 英文逗号
    '，', // 中文逗号
    ' ', // 空格
    '', // 字符
  ];

  constructor(config: TokenTextSplitterConfig = {}) {
    this.config = {
      mode: config.mode ?? SplitMode.RECURSIVE,
      chunkSize: config.chunkSize ?? 500,
      chunkOverlap: config.chunkOverlap ?? 50,
      separators: config.separators ?? TokenTextSplitter.DEFAULT_SEPARATORS,
      keepSeparator: config.keepSeparator ?? true,
      tokenCharRatio: config.tokenCharRatio ?? 0.5, // 估算：1个token约等于2个字符（中文）
    };
  }

  /**
   * 分割文本
   */
  splitText(text: string): string[] {
    switch (this.config.mode) {
      case SplitMode.CHARACTER:
        return this.splitByCharacter(text);
      case SplitMode.TOKEN:
        return this.splitByToken(text);
      case SplitMode.SENTENCE:
        return this.splitBySentence(text);
      case SplitMode.PARAGRAPH:
        return this.splitByParagraph(text);
      case SplitMode.RECURSIVE:
      default:
        return this.splitRecursively(text, this.config.separators);
    }
  }

  /**
   * 分割文档
   */
  splitDocument(doc: Document): Document[] {
    const chunks = this.splitText(doc.content);

    return chunks.map((chunk, index) => ({
      id: uuidv4(),
      content: chunk,
      metadata: {
        ...doc.metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
        parentId: doc.id,
        splitMode: this.config.mode,
      },
    }));
  }

  /**
   * 分割多个文档
   */
  splitDocuments(docs: Document[]): Document[] {
    const result: Document[] = [];
    for (const doc of docs) {
      result.push(...this.splitDocument(doc));
    }
    return result;
  }

  /**
   * 按字符数分割
   */
  private splitByCharacter(text: string): string[] {
    const chunks: string[] = [];
    const { chunkSize, chunkOverlap } = this.config;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end).trim());

      start = end - chunkOverlap;
      if (start >= text.length - chunkOverlap) break;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * 按Token数分割（估算）
   */
  private splitByToken(text: string): string[] {
    // 估算字符数
    const charChunkSize = Math.floor(this.config.chunkSize / this.config.tokenCharRatio);
    const charOverlap = Math.floor(this.config.chunkOverlap / this.config.tokenCharRatio);

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + charChunkSize, text.length);
      chunks.push(text.slice(start, end).trim());

      start = end - charOverlap;
      if (start >= text.length - charOverlap) break;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * 按句子分割
   */
  private splitBySentence(text: string): string[] {
    // 使用句子结束符分割
    const sentenceEnders = /([。！？.!?])/g;
    const sentences: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = sentenceEnders.exec(text)) !== null) {
      sentences.push(text.slice(lastIndex, match.index + match[0].length).trim());
      lastIndex = match.index + match[0].length;
    }

    // 添加最后一部分
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex).trim();
      if (remaining.length > 0) {
        sentences.push(remaining);
      }
    }

    // 合并小句子，分割大句子
    return this.mergeSentencesToChunks(sentences);
  }

  /**
   * 合并句子为块
   */
  private mergeSentencesToChunks(sentences: string[]): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.config.chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // 如果单个句子超过块大小，需要进一步分割
        if (sentence.length > this.config.chunkSize) {
          chunks.push(...this.splitByCharacter(sentence));
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * 按段落分割
   */
  private splitByParagraph(text: string): string[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.length <= this.config.chunkSize) {
        chunks.push(paragraph.trim());
      } else {
        // 段落太长，递归分割
        chunks.push(...this.splitRecursively(paragraph, this.config.separators.slice(1)));
      }
    }

    return chunks;
  }

  /**
   * 递归分割（保持语义完整性）
   */
  private splitRecursively(text: string, separators: string[]): string[] {
    const { chunkSize, keepSeparator } = this.config;

    // 如果文本足够短，直接返回
    if (text.length <= chunkSize) {
      return [text.trim()].filter((t) => t.length > 0);
    }

    // 如果没有更多分隔符，使用字符分割
    if (separators.length === 0) {
      return this.splitByCharacter(text);
    }

    const separator = separators[0];
    const nextSeparators = separators.slice(1);

    // 使用当前分隔符分割
    let splits: string[];
    if (separator === '') {
      // 空分隔符表示按字符分割
      splits = text.split('');
    } else {
      splits = text.split(separator);
    }

    // 如果分割无效（只有一个部分），尝试下一个分隔符
    if (splits.length <= 1) {
      return this.splitRecursively(text, nextSeparators);
    }

    // 重新添加分隔符（如果需要保留）
    if (keepSeparator && separator !== '') {
      splits = splits.map((s, i) => (i < splits.length - 1 ? s + separator : s));
    }

    // 合并小块并递归处理大块
    const chunks: string[] = [];
    let currentChunk = '';

    for (const split of splits) {
      const trimmedSplit = split.trim();
      if (!trimmedSplit) continue;

      if (currentChunk.length + trimmedSplit.length <= chunkSize) {
        currentChunk += (currentChunk ? '' : '') + split;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        // 如果单个分割部分仍然太大，递归处理
        if (trimmedSplit.length > chunkSize) {
          chunks.push(...this.splitRecursively(trimmedSplit, nextSeparators));
          currentChunk = '';
        } else {
          currentChunk = split;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // 处理重叠
    return this.addOverlap(chunks);
  }

  /**
   * 添加块间重叠
   */
  private addOverlap(chunks: string[]): string[] {
    if (this.config.chunkOverlap <= 0 || chunks.length <= 1) {
      return chunks;
    }

    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];

      // 从前一个块添加重叠部分
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const overlapStart = Math.max(0, prevChunk.length - this.config.chunkOverlap);
        const overlap = prevChunk.slice(overlapStart);
        chunk = overlap + chunk;
      }

      // 确保不超过最大块大小
      if (chunk.length > this.config.chunkSize * 1.5) {
        chunk = chunk.slice(0, Math.floor(this.config.chunkSize * 1.5));
      }

      result.push(chunk);
    }

    return result;
  }

  /**
   * 估算文本的Token数
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length * this.config.tokenCharRatio);
  }

  /**
   * 创建构建器
   */
  static builder(): TokenTextSplitterBuilder {
    return new TokenTextSplitterBuilder();
  }
}

/**
 * Token 文本分割器构建器
 */
export class TokenTextSplitterBuilder {
  private config: TokenTextSplitterConfig = {};

  withMode(mode: SplitMode): TokenTextSplitterBuilder {
    this.config.mode = mode;
    return this;
  }

  withChunkSize(size: number): TokenTextSplitterBuilder {
    this.config.chunkSize = size;
    return this;
  }

  withChunkOverlap(overlap: number): TokenTextSplitterBuilder {
    this.config.chunkOverlap = overlap;
    return this;
  }

  withSeparators(separators: string[]): TokenTextSplitterBuilder {
    this.config.separators = separators;
    return this;
  }

  withKeepSeparator(keep: boolean): TokenTextSplitterBuilder {
    this.config.keepSeparator = keep;
    return this;
  }

  withTokenCharRatio(ratio: number): TokenTextSplitterBuilder {
    this.config.tokenCharRatio = ratio;
    return this;
  }

  build(): TokenTextSplitter {
    return new TokenTextSplitter(this.config);
  }
}
