package com.github.tianchenghang.agent;

import com.github.tianchenghang.advisor.LoggerAdvisor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Component;

@Component
public class CodeManus extends ToolCallAgent {

  public CodeManus(ToolCallback[] allTools, ChatModel dashscopeChatModel) {
    super(allTools);
    this.setName("Code Master");
    var SYSTEM_PROMPT =
        """
              You are Code Master, an all-capable AI assistant, aimed at solving any task presented by the user.
              You have various tools at your disposal that you can call upon to efficiently complete complex requests.
              """;
    this.setSystemPrompt(SYSTEM_PROMPT);
    var NEXT_STEP_PROMPT =
        """
              Based on user needs, proactively select the most appropriate tool or combination of tools.
              For complex tasks, you can break down the problem and use different tools step by step to solve it.
              After using each tool, clearly explain the execution results and suggest the next steps.
              If you want to stop the interaction at any point, use the `doTerminate` tool/function call.
              """;
    this.setNextStepPrompt(NEXT_STEP_PROMPT);
    this.setMaxSteps(20);
    var chatClient =
        ChatClient.builder(dashscopeChatModel).defaultAdvisors(new LoggerAdvisor()).build();
    this.setChatClient(chatClient);
  }
}
