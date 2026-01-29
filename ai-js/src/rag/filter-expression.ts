import { Logger } from '@nestjs/common';

/**
 * 过滤操作符
 */
export enum FilterOperator {
  /** 等于 */
  EQ = 'eq',
  /** 不等于 */
  NE = 'ne',
  /** 大于 */
  GT = 'gt',
  /** 大于等于 */
  GTE = 'gte',
  /** 小于 */
  LT = 'lt',
  /** 小于等于 */
  LTE = 'lte',
  /** 包含 */
  IN = 'in',
  /** 不包含 */
  NIN = 'nin',
  /** 包含子串 */
  CONTAINS = 'contains',
  /** 以...开头 */
  STARTS_WITH = 'startsWith',
  /** 以...结尾 */
  ENDS_WITH = 'endsWith',
  /** 存在 */
  EXISTS = 'exists',
  /** 与 */
  AND = 'and',
  /** 或 */
  OR = 'or',
  /** 非 */
  NOT = 'not',
}

/**
 * 过滤表达式接口
 */
export interface FilterExpression {
  /** 操作符 */
  operator: FilterOperator;
  /** 字段名（用于比较操作） */
  field?: string;
  /** 比较值 */
  value?: unknown;
  /** 子表达式（用于逻辑操作） */
  expressions?: FilterExpression[];
}

/**
 * 过滤表达式构建器
 * 参考 Java 版本的 FilterExpressionBuilder 实现
 */
export class FilterExpressionBuilder {
  private readonly logger = new Logger(FilterExpressionBuilder.name);

  /**
   * 等于
   */
  eq(field: string, value: unknown): FilterExpression {
    return { operator: FilterOperator.EQ, field, value };
  }

  /**
   * 不等于
   */
  ne(field: string, value: unknown): FilterExpression {
    return { operator: FilterOperator.NE, field, value };
  }

  /**
   * 大于
   */
  gt(field: string, value: number): FilterExpression {
    return { operator: FilterOperator.GT, field, value };
  }

  /**
   * 大于等于
   */
  gte(field: string, value: number): FilterExpression {
    return { operator: FilterOperator.GTE, field, value };
  }

  /**
   * 小于
   */
  lt(field: string, value: number): FilterExpression {
    return { operator: FilterOperator.LT, field, value };
  }

  /**
   * 小于等于
   */
  lte(field: string, value: number): FilterExpression {
    return { operator: FilterOperator.LTE, field, value };
  }

  /**
   * 包含在数组中
   */
  in(field: string, values: unknown[]): FilterExpression {
    return { operator: FilterOperator.IN, field, value: values };
  }

  /**
   * 不包含在数组中
   */
  nin(field: string, values: unknown[]): FilterExpression {
    return { operator: FilterOperator.NIN, field, value: values };
  }

  /**
   * 包含子串
   */
  contains(field: string, value: string): FilterExpression {
    return { operator: FilterOperator.CONTAINS, field, value };
  }

  /**
   * 以指定字符串开头
   */
  startsWith(field: string, value: string): FilterExpression {
    return { operator: FilterOperator.STARTS_WITH, field, value };
  }

  /**
   * 以指定字符串结尾
   */
  endsWith(field: string, value: string): FilterExpression {
    return { operator: FilterOperator.ENDS_WITH, field, value };
  }

  /**
   * 字段存在
   */
  exists(field: string): FilterExpression {
    return { operator: FilterOperator.EXISTS, field, value: true };
  }

  /**
   * 字段不存在
   */
  notExists(field: string): FilterExpression {
    return { operator: FilterOperator.EXISTS, field, value: false };
  }

  /**
   * 与操作
   */
  and(...expressions: FilterExpression[]): FilterExpression {
    return { operator: FilterOperator.AND, expressions };
  }

  /**
   * 或操作
   */
  or(...expressions: FilterExpression[]): FilterExpression {
    return { operator: FilterOperator.OR, expressions };
  }

  /**
   * 非操作
   */
  not(expression: FilterExpression): FilterExpression {
    return { operator: FilterOperator.NOT, expressions: [expression] };
  }

  /**
   * 构建表达式（返回自身，用于链式调用）
   */
  build(): FilterExpressionBuilder {
    return this;
  }
}

/**
 * 过滤表达式求值器
 */
export class FilterExpressionEvaluator {
  private readonly logger = new Logger(FilterExpressionEvaluator.name);

  /**
   * 评估过滤表达式
   * @param expression 过滤表达式
   * @param metadata 文档元数据
   * @returns 是否匹配
   */
  evaluate(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    if (!expression) return true;

    switch (expression.operator) {
      case FilterOperator.EQ:
        return this.evaluateEq(expression, metadata);
      case FilterOperator.NE:
        return !this.evaluateEq(expression, metadata);
      case FilterOperator.GT:
        return this.evaluateComparison(expression, metadata, (a, b) => a > b);
      case FilterOperator.GTE:
        return this.evaluateComparison(expression, metadata, (a, b) => a >= b);
      case FilterOperator.LT:
        return this.evaluateComparison(expression, metadata, (a, b) => a < b);
      case FilterOperator.LTE:
        return this.evaluateComparison(expression, metadata, (a, b) => a <= b);
      case FilterOperator.IN:
        return this.evaluateIn(expression, metadata);
      case FilterOperator.NIN:
        return !this.evaluateIn(expression, metadata);
      case FilterOperator.CONTAINS:
        return this.evaluateContains(expression, metadata);
      case FilterOperator.STARTS_WITH:
        return this.evaluateStartsWith(expression, metadata);
      case FilterOperator.ENDS_WITH:
        return this.evaluateEndsWith(expression, metadata);
      case FilterOperator.EXISTS:
        return this.evaluateExists(expression, metadata);
      case FilterOperator.AND:
        return this.evaluateAnd(expression, metadata);
      case FilterOperator.OR:
        return this.evaluateOr(expression, metadata);
      case FilterOperator.NOT:
        return this.evaluateNot(expression, metadata);
      default:
        this.logger.warn(`Unknown operator: ${expression.operator}`);
        return true;
    }
  }

  private evaluateEq(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    return fieldValue === expression.value;
  }

  private evaluateComparison(
    expression: FilterExpression,
    metadata: Record<string, unknown>,
    compareFn: (a: number, b: number) => boolean,
  ): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    if (typeof fieldValue !== 'number' || typeof expression.value !== 'number') {
      return false;
    }
    return compareFn(fieldValue, expression.value);
  }

  private evaluateIn(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    const values = expression.value as unknown[];
    return Array.isArray(values) && values.includes(fieldValue);
  }

  private evaluateContains(
    expression: FilterExpression,
    metadata: Record<string, unknown>,
  ): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    if (typeof fieldValue !== 'string' || typeof expression.value !== 'string') {
      return false;
    }
    return fieldValue.includes(expression.value);
  }

  private evaluateStartsWith(
    expression: FilterExpression,
    metadata: Record<string, unknown>,
  ): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    if (typeof fieldValue !== 'string' || typeof expression.value !== 'string') {
      return false;
    }
    return fieldValue.startsWith(expression.value);
  }

  private evaluateEndsWith(
    expression: FilterExpression,
    metadata: Record<string, unknown>,
  ): boolean {
    const fieldValue = this.getFieldValue(expression.field!, metadata);
    if (typeof fieldValue !== 'string' || typeof expression.value !== 'string') {
      return false;
    }
    return fieldValue.endsWith(expression.value);
  }

  private evaluateExists(
    expression: FilterExpression,
    metadata: Record<string, unknown>,
  ): boolean {
    const exists = expression.field! in metadata;
    return expression.value === true ? exists : !exists;
  }

  private evaluateAnd(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    if (!expression.expressions || expression.expressions.length === 0) {
      return true;
    }
    return expression.expressions.every((expr) => this.evaluate(expr, metadata));
  }

  private evaluateOr(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    if (!expression.expressions || expression.expressions.length === 0) {
      return true;
    }
    return expression.expressions.some((expr) => this.evaluate(expr, metadata));
  }

  private evaluateNot(expression: FilterExpression, metadata: Record<string, unknown>): boolean {
    if (!expression.expressions || expression.expressions.length === 0) {
      return true;
    }
    return !this.evaluate(expression.expressions[0], metadata);
  }

  /**
   * 获取字段值（支持嵌套字段，如 "a.b.c"）
   */
  private getFieldValue(field: string, metadata: Record<string, unknown>): unknown {
    const parts = field.split('.');
    let value: unknown = metadata;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}
