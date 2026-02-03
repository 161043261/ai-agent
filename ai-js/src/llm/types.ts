export interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAiMessage {
  role: string;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAiToolCall[];
}

export interface OpenAiResponse {
  choices: {
    message: {
      content?: string;
      tool_calls?: OpenAiToolCall[];
    };
  }[];
}

export interface OpenAiStreamResponse {
  choices: {
    delta: {
      content?: string;
    };
  }[];
}

export interface OllamaModels {
  models?: { name: string }[];
}
