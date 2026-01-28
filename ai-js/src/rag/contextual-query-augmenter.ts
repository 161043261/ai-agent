import { Logger } from '@nestjs/common';
import { Document } from './vector-store.interface';

/**
 * 上下文查询增强器配置
 */
export interface ContextualQueryAugmenterConfig {
  /** 是否允许空上下文 */
  allowEmptyContext?: boolean;
  /** 空上下文时的提示模板 */
  emptyContextPromptTemplate?: string;
  /** 上下文模板 */
  contextTemplate?: string;
}

/**
 * 上下文查询增强器
 *
 * 用于在 RAG 流程中增强查询，处理空上下文情况
 */
export class ContextualQueryAugmenter {
  private readonly logger = new Logger(ContextualQueryAugmenter.name);
  private readonly config: Required<ContextualQueryAugmenterConfig>;

  private static readonly DEFAULT_CONTEXT_TEMPLATE = `以下是相关的参考资料：

{context}

请基于以上资料回答用户的问题。`;

  private static readonly DEFAULT_EMPTY_CONTEXT_TEMPLATE = `抱歉，我没有找到与您问题相关的资料。请尝试换一种方式提问，或者咨询其他渠道。`;

  constructor(config: ContextualQueryAugmenterConfig = {}) {
    this.config = {
      allowEmptyContext: config.allowEmptyContext ?? true,
      emptyContextPromptTemplate:
        config.emptyContextPromptTemplate ??
        ContextualQueryAugmenter.DEFAULT_EMPTY_CONTEXT_TEMPLATE,
      contextTemplate: config.contextTemplate ?? ContextualQueryAugmenter.DEFAULT_CONTEXT_TEMPLATE,
    };
  }

  /**
   * 增强查询
   * @param query 原始查询
   * @param documents 检索到的文档
   * @returns 增强后的查询或提示
   */
  augment(query: string, documents: Document[]): AugmentResult {
    // 检查是否有有效文档
    const validDocuments = documents.filter((doc) => doc.content && doc.content.trim().length > 0);

    if (validDocuments.length === 0) {
      this.logger.log('No valid context documents found');

      if (!this.config.allowEmptyContext) {
        return {
          success: false,
          augmentedQuery: query,
          contextPrompt: this.config.emptyContextPromptTemplate,
          hasContext: false,
        };
      }

      // 允许空上下文，返回原查询
      return {
        success: true,
        augmentedQuery: query,
        contextPrompt: '',
        hasContext: false,
      };
    }

    // 构建上下文
    const context = validDocuments.map((doc) => doc.content).join('\n\n---\n\n');

    const contextPrompt = this.config.contextTemplate.replace('{context}', context);

    return {
      success: true,
      augmentedQuery: query,
      contextPrompt,
      hasContext: true,
      documentCount: validDocuments.length,
    };
  }

  /**
   * 构建完整的增强提示词
   */
  buildAugmentedPrompt(query: string, documents: Document[], systemPrompt?: string): string {
    const result = this.augment(query, documents);

    if (!result.hasContext && !this.config.allowEmptyContext) {
      return result.contextPrompt; // 返回空上下文提示
    }

    const parts: string[] = [];

    if (systemPrompt) {
      parts.push(systemPrompt);
    }

    if (result.contextPrompt) {
      parts.push(result.contextPrompt);
    }

    return parts.join('\n\n');
  }

  /**
   * 构建器模式
   */
  static builder(): ContextualQueryAugmenterBuilder {
    return new ContextualQueryAugmenterBuilder();
  }
}

/**
 * 增强结果
 */
export interface AugmentResult {
  /** 是否成功（有上下文或允许空上下文） */
  success: boolean;
  /** 增强后的查询 */
  augmentedQuery: string;
  /** 上下文提示词 */
  contextPrompt: string;
  /** 是否有上下文 */
  hasContext: boolean;
  /** 文档数量 */
  documentCount?: number;
}

/**
 * 上下文查询增强器构建器
 */
export class ContextualQueryAugmenterBuilder {
  private config: ContextualQueryAugmenterConfig = {};

  allowEmptyContext(allow: boolean): ContextualQueryAugmenterBuilder {
    this.config.allowEmptyContext = allow;
    return this;
  }

  emptyContextPromptTemplate(template: string): ContextualQueryAugmenterBuilder {
    this.config.emptyContextPromptTemplate = template;
    return this;
  }

  contextTemplate(template: string): ContextualQueryAugmenterBuilder {
    this.config.contextTemplate = template;
    return this;
  }

  build(): ContextualQueryAugmenter {
    return new ContextualQueryAugmenter(this.config);
  }
}

/**
 * 创建恋爱应用的上下文查询增强器
 */
export function createLoveAppContextualQueryAugmenter(): ContextualQueryAugmenter {
  const emptyContextPromptTemplate = `你应该输出下面的内容：
抱歉, 我只能回答恋爱相关的问题, 别的没办法帮到您哦,
有问题可以联系编程导航客服 https://codefather.cn`;

  return ContextualQueryAugmenter.builder()
    .allowEmptyContext(false)
    .emptyContextPromptTemplate(emptyContextPromptTemplate)
    .build();
}
