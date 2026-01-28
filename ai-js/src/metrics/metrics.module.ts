import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    // HTTP 请求计数器
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    // HTTP 请求延迟直方图
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    }),
    // LLM 调用计数器
    makeCounterProvider({
      name: 'llm_requests_total',
      help: 'Total number of LLM API requests',
      labelNames: ['provider', 'model', 'status'],
    }),
    // LLM 调用延迟直方图
    makeHistogramProvider({
      name: 'llm_request_duration_seconds',
      help: 'LLM API request duration in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
    }),
    // LLM Token 使用量
    makeCounterProvider({
      name: 'llm_tokens_total',
      help: 'Total number of tokens used',
      labelNames: ['provider', 'model', 'type'],
    }),
    // Agent 执行计数器
    makeCounterProvider({
      name: 'agent_executions_total',
      help: 'Total number of agent executions',
      labelNames: ['agent_type', 'status'],
    }),
    // Agent 执行步数直方图
    makeHistogramProvider({
      name: 'agent_steps_total',
      help: 'Number of steps per agent execution',
      labelNames: ['agent_type'],
      buckets: [1, 2, 3, 5, 10, 15, 20],
    }),
    // 活跃连接数
    makeGaugeProvider({
      name: 'active_connections',
      help: 'Number of active connections',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
