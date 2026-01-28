import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';
import { Document } from './vector-store.interface';

/**
 * Markdown 文档阅读器配置
 */
export interface MarkdownDocumentReaderConfig {
  /** 是否在水平分隔线处创建新文档 */
  horizontalRuleCreateDocument?: boolean;
  /** 是否包含代码块 */
  includeCodeBlock?: boolean;
  /** 是否包含引用块 */
  includeBlockquote?: boolean;
  /** 额外的元数据 */
  additionalMetadata?: Record<string, unknown>;
  /** 从文件名提取状态的配置 */
  extractStatusFromFilename?: boolean;
  /** 状态字段在文件名中的位置（从末尾数） */
  statusPositionFromEnd?: number;
  /** 状态字段长度 */
  statusLength?: number;
}

/**
 * 高级 Markdown 文档阅读器
 */
export class MarkdownDocumentReader {
  private readonly logger = new Logger(MarkdownDocumentReader.name);
  private readonly config: Required<MarkdownDocumentReaderConfig>;

  constructor(config: MarkdownDocumentReaderConfig = {}) {
    this.config = {
      horizontalRuleCreateDocument: config.horizontalRuleCreateDocument ?? false,
      includeCodeBlock: config.includeCodeBlock ?? true,
      includeBlockquote: config.includeBlockquote ?? true,
      additionalMetadata: config.additionalMetadata ?? {},
      extractStatusFromFilename: config.extractStatusFromFilename ?? false,
      statusPositionFromEnd: config.statusPositionFromEnd ?? 6,
      statusLength: config.statusLength ?? 2,
    };
  }

  /**
   * 从文件名提取状态
   * 例如：恋爱常见问题和回答 - 单身篇.md => 单身
   */
  private extractStatusFromFilename(filename: string): string | undefined {
    if (!this.config.extractStatusFromFilename) {
      return undefined;
    }

    // 移除扩展名
    const nameWithoutExt = filename.replace(/\.md$/i, '');
    const { statusPositionFromEnd, statusLength } = this.config;

    if (nameWithoutExt.length >= statusPositionFromEnd) {
      return nameWithoutExt.substring(
        nameWithoutExt.length - statusPositionFromEnd,
        nameWithoutExt.length - statusPositionFromEnd + statusLength,
      );
    }
    return undefined;
  }

  /**
   * 处理 Markdown 内容
   */
  private processContent(content: string): string {
    let processed = content;

    // 移除代码块（如果配置为不包含）
    if (!this.config.includeCodeBlock) {
      processed = processed.replace(/```[\s\S]*?```/g, '');
    }

    // 移除引用块（如果配置为不包含）
    if (!this.config.includeBlockquote) {
      processed = processed.replace(/^>.*$/gm, '');
    }

    return processed.trim();
  }

  /**
   * 按水平分隔线分割文档
   */
  private splitByHorizontalRule(content: string): string[] {
    if (!this.config.horizontalRuleCreateDocument) {
      return [content];
    }

    // 匹配 Markdown 水平分隔线: ---, ***, ___
    const sections = content.split(/^(?:[-*_]){3,}\s*$/m);
    return sections.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * 读取 Markdown 文件并解析为文档
   */
  async read(filePath: string): Promise<Document[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // 提取状态
    const status = this.extractStatusFromFilename(fileName);

    // 构建基础元数据
    const baseMetadata: Record<string, unknown> = {
      source: filePath,
      filename: fileName,
      type: 'markdown',
      ...this.config.additionalMetadata,
    };

    if (status) {
      baseMetadata.status = status;
    }

    // 按分隔线分割
    const sections = this.splitByHorizontalRule(content);
    const documents: Document[] = [];

    for (let i = 0; i < sections.length; i++) {
      const processedContent = this.processContent(sections[i]);
      if (processedContent.length === 0) continue;

      documents.push({
        id: uuidv4(),
        content: processedContent,
        metadata: {
          ...baseMetadata,
          sectionIndex: i,
          sectionCount: sections.length,
        },
      });
    }

    this.logger.log(`Read ${documents.length} documents from ${fileName}`);
    return documents;
  }

  /**
   * 配置构建器
   */
  static builder(): MarkdownDocumentReaderConfigBuilder {
    return new MarkdownDocumentReaderConfigBuilder();
  }
}

/**
 * Markdown 文档阅读器配置构建器
 */
export class MarkdownDocumentReaderConfigBuilder {
  private config: MarkdownDocumentReaderConfig = {};

  withHorizontalRuleCreateDocument(value: boolean): MarkdownDocumentReaderConfigBuilder {
    this.config.horizontalRuleCreateDocument = value;
    return this;
  }

  withIncludeCodeBlock(value: boolean): MarkdownDocumentReaderConfigBuilder {
    this.config.includeCodeBlock = value;
    return this;
  }

  withIncludeBlockquote(value: boolean): MarkdownDocumentReaderConfigBuilder {
    this.config.includeBlockquote = value;
    return this;
  }

  withAdditionalMetadata(key: string, value: unknown): MarkdownDocumentReaderConfigBuilder {
    this.config.additionalMetadata = {
      ...this.config.additionalMetadata,
      [key]: value,
    };
    return this;
  }

  withExtractStatusFromFilename(value: boolean): MarkdownDocumentReaderConfigBuilder {
    this.config.extractStatusFromFilename = value;
    return this;
  }

  withStatusPosition(positionFromEnd: number, length: number): MarkdownDocumentReaderConfigBuilder {
    this.config.statusPositionFromEnd = positionFromEnd;
    this.config.statusLength = length;
    return this;
  }

  build(): MarkdownDocumentReaderConfig {
    return { ...this.config };
  }
}

/**
 * 文档加载器
 * 增强版，支持高级 Markdown 配置
 */
export class DocumentLoader {
  private readonly logger = new Logger(DocumentLoader.name);

  /**
   * 加载 Markdown 文件（基础方法）
   */
  async loadMarkdown(filePath: string): Promise<Document> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    return {
      id: uuidv4(),
      content,
      metadata: {
        source: filePath,
        fileName,
        type: 'markdown',
      },
    };
  }

  /**
   * 使用高级配置加载 Markdown 文件
   */
  async loadMarkdownWithConfig(
    filePath: string,
    config: MarkdownDocumentReaderConfig,
  ): Promise<Document[]> {
    const reader = new MarkdownDocumentReader(config);
    return reader.read(filePath);
  }

  /**
   * 加载目录下所有 Markdown 文件（基础方法）
   */
  async loadMarkdownDirectory(dirPath: string): Promise<Document[]> {
    const documents: Document[] = [];
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        const doc = await this.loadMarkdown(filePath);
        documents.push(doc);
      }
    }

    return documents;
  }

  /**
   * 使用高级配置加载目录下所有 Markdown 文件
   */
  async loadMarkdownDirectoryWithConfig(
    dirPath: string,
    config: MarkdownDocumentReaderConfig,
  ): Promise<Document[]> {
    const documents: Document[] = [];
    const files = await fs.readdir(dirPath);
    const reader = new MarkdownDocumentReader(config);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        const docs = await reader.read(filePath);
        documents.push(...docs);
      }
    }

    this.logger.log(`Loaded ${documents.length} documents from ${dirPath}`);
    return documents;
  }

  /**
   * 分割文档
   */
  splitDocument(doc: Document, chunkSize: number = 500, overlap: number = 50): Document[] {
    const content = doc.content;
    const chunks: Document[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);

      chunks.push({
        id: uuidv4(),
        content: chunk,
        metadata: {
          ...doc.metadata,
          chunkIndex: chunks.length,
          parentId: doc.id,
        },
      });

      start = end - overlap;
      if (start >= content.length - overlap) break;
    }

    return chunks;
  }
}

/**
 * 创建恋爱应用的文档加载器配置
 */
export function createLoveAppDocumentLoaderConfig(): MarkdownDocumentReaderConfig {
  return MarkdownDocumentReader.builder()
    .withHorizontalRuleCreateDocument(true)
    .withIncludeCodeBlock(false)
    .withIncludeBlockquote(false)
    .withExtractStatusFromFilename(true)
    .withStatusPosition(4, 2) // 例如 "单身篇" -> 提取 "单身"
    .build();
}
