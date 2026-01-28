/**
 * Agent 状态枚举
 */
export enum AgentState {
  /** 空闲状态 */
  IDLE = 'IDLE',
  /** 运行中 */
  RUNNING = 'RUNNING',
  /** 已完成 */
  FINISHED = 'FINISHED',
  /** 错误状态 */
  ERROR = 'ERROR',
}
