import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,

    @InjectMetric('llm_requests_total')
    private readonly llmRequestsCounter: Counter<string>,

    @InjectMetric('llm_request_duration_seconds')
    private readonly llmRequestDuration: Histogram<string>,

    @InjectMetric('llm_tokens_total')
    private readonly llmTokensCounter: Counter<string>,

    @InjectMetric('agent_executions_total')
    private readonly agentExecutionsCounter: Counter<string>,

    @InjectMetric('agent_steps_total')
    private readonly agentStepsHistogram: Histogram<string>,

    @InjectMetric('active_connections')
    private readonly activeConnectionsGauge: Gauge<string>,
  ) {}

  // Http request metrics
  recordHttpRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
  ) {
    this.httpRequestsCounter.inc({ method, path, status: status.toString() });
    this.httpRequestDuration.observe(
      { method, path, status: status.toString() },
      duration,
    );
  }

  // Llm request metrics
  recordLlmRequest(
    provider: string,
    model: string,
    status: 'success' | 'error',
    duration: number,
  ) {
    this.llmRequestsCounter.inc({ provider, model, status });
    this.llmRequestDuration.observe({ provider, model }, duration);
  }

  // Llm token usage
  recordLlmTokens(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ) {
    this.llmTokensCounter.inc({ provider, model, type: 'input' }, inputTokens);
    this.llmTokensCounter.inc(
      { provider, model, type: 'output' },
      outputTokens,
    );
  }

  // Agent execution metrics
  recordAgentExecution(
    agentType: string,
    status: 'success' | 'error',
    steps: number,
  ) {
    this.agentExecutionsCounter.inc({ agent_type: agentType, status });
    this.agentStepsHistogram.observe({ agent_type: agentType }, steps);
  }

  // Active connections count
  setActiveConnections(count: number) {
    this.activeConnectionsGauge.set(count);
  }

  incrementActiveConnections() {
    this.activeConnectionsGauge.inc();
  }

  decrementActiveConnections() {
    this.activeConnectionsGauge.dec();
  }
}
