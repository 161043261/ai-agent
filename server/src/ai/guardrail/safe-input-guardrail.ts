import { Injectable, Logger } from '@nestjs/common';

export interface GuardrailResult {
  safe: boolean;
  failures: string[];
}

@Injectable()
export class SafeInputGuardrail {
  private readonly logger = new Logger(SafeInputGuardrail.name);
  private readonly sensitiveWords = new Set(['fuck', 'fucker', 'motherfucker']);

  validate(input: string): GuardrailResult {
    const inputText = input.toLowerCase();
    const safe = true;
    const failures: string[] = [];
    const words = inputText.split(/\w+/);
    for (const word of words) {
      if (this.sensitiveWords.has(word)) {
        this.logger.warn(`Sensitive word detected: ${word}`);
        failures.push(`Sensitive word detected: ${word}`);
      }
    }
    return { safe, failures };
  }
}
