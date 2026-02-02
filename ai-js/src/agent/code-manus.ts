import { ChatModel } from "../llm/chat-model";
import { Tool, ToolExecutor } from "../tools/tool";
import { ToolCallAgent } from "./tool-call-agent";

const SYSTEM_PROMPT = `
You are Code Master, an all-capable AI assistant, aimed at solving any task presented by the user.
              You have various tools at your disposal that you can call upon to efficiently complete complex requests.
`

const NEXT_STEP_PROMPT = `
Based on user needs, proactively select the most appropriate tool or combination of tools.
              For complex tasks, you can break down the problem and use different tools step by step to solve it.
              After using each tool, clearly explain the execution results and suggest the next steps.
              If you want to stop the interaction at any point, use the \`doTerminate\` tool/function call.
`

export class CodeManus extends ToolCallAgent {

  constructor(
    tools: Tool[],
    toolExecutor: ToolExecutor,
    chatModel: ChatModel,
    ragContext?: string,
  ) {
    super(tools, toolExecutor);
    this.name = CodeManus.name;
    this.systemPrompt = ragContext ? `${SYSTEM_PROMPT}\n\n${ragContext}` : SYSTEM_PROMPT;
    this.nextStepPrompt = NEXT_STEP_PROMPT;
    this.maxSteps = 20;
    this.chatModel = chatModel;
  }
}
