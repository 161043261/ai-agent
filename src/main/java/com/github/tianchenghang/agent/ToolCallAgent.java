package com.github.tianchenghang.agent;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.github.tianchenghang.agent.model.AgentState;
import java.util.stream.Collectors;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.tool.ToolCallback;

// Base agent class for handling tool calls, implementing the think and act methods, and can be used
// as a parent class for creating instances.
@EqualsAndHashCode(callSuper = true)
@Data
@Slf4j
public class ToolCallAgent extends ReActAgent {

  // Available tools
  private final ToolCallback[] availableTools;

  // Stores the response results of tool calls (which tools to call)
  private ChatResponse toolCallChatResponse;

  // Tool calling manager
  private final ToolCallingManager toolCallingManager;

  // Disable Spring AI's built-in tool calling mechanism and maintain options and message context
  // manually
  private final ChatOptions chatOptions;

  public ToolCallAgent(ToolCallback[] availableTools) {
    super();
    this.availableTools = availableTools;
    this.toolCallingManager = ToolCallingManager.builder().build();

    // Disable Spring AI's built-in tool calling mechanism and maintain options and message context
    // manually
    this.chatOptions =
        DashScopeChatOptions.builder().withInternalToolExecutionEnabled(false).build();
  }

  // Processes the current state and decides the next action.
  @Override
  public boolean think() {
    // 1. Validate the prompt and concatenate the user prompt
    if (StrUtil.isNotBlank(getNextStepPrompt())) {
      var userMessage = new UserMessage(getNextStepPrompt());
      getMessageList().add(userMessage);
    }
    // 2. Call the AI model to get the tool call results
    var messageList = getMessageList();
    var prompt = new Prompt(messageList, this.chatOptions);
    try {
      var chatResponse =
          getChatClient()
              .prompt(prompt)
              .system(getSystemPrompt())
              .tools(availableTools)
              .call()
              .chatResponse();
      // Record the response for later use in Act
      this.toolCallChatResponse = chatResponse;
      // 3. Parse the tool call results to get the tools to call
      // Assistant message
      var assistantMessage = chatResponse.getResult().getOutput();
      // Get the list of tools to call
      var toolCallList = assistantMessage.getToolCalls();
      // Output prompt information
      var result = assistantMessage.getText();
      log.info(getName() + " thinking: " + result);
      log.info(getName() + " selected " + toolCallList.size() + " tools to use");
      // Send the thinking content to SSE
      emitThinking(result);
      var toolCallInfo =
          toolCallList.stream()
              .map(
                  toolCall ->
                      String.format(
                          "Tool name: %s, arguments: %s", toolCall.name(), toolCall.arguments()))
              .collect(Collectors.joining("\n"));
      log.info(toolCallInfo);
      // Send tool call information to SSE
      for (var toolCall : toolCallList) {
        emitToolCall(toolCall.name(), toolCall.arguments());
      }
      // If no tools need to be called, return false
      if (toolCallList.isEmpty()) {
        // Only when no tools are called, manually record the assistant message
        getMessageList().add(assistantMessage);
        return false;
      } else {
        // When tools need to be called, no need to record the assistant message as it will be
        // automatically recorded during tool calls
        return true;
      }
    } catch (Exception e) {
      log.error(getName() + " encountered an issue during processing: " + e.getMessage());
      getMessageList()
          .add(new AssistantMessage("An error occurred during processing: " + e.getMessage()));
      return false;
    }
  }

  @Override
  public String act() {
    if (!toolCallChatResponse.hasToolCalls()) {
      return "No tools need to be called";
    }
    // Call tools
    var prompt = new Prompt(getMessageList(), this.chatOptions);
    var toolExecutionResult = toolCallingManager.executeToolCalls(prompt, toolCallChatResponse);
    // Record message context, conversationHistory already includes assistant messages and tool call
    // results
    setMessageList(toolExecutionResult.conversationHistory());
    var toolResponseMessage =
        (ToolResponseMessage) CollUtil.getLast(toolExecutionResult.conversationHistory());
    // Check if a terminate tool was called
    var terminateToolCalled =
        toolResponseMessage.getResponses().stream()
            .anyMatch(response -> response.name().equals("doTerminate"));
    if (terminateToolCalled) {
      // Task completed, update state
      setState(AgentState.FINISHED);
    }
    // Send each tool's result to SSE
    for (ToolResponseMessage.ToolResponse response : toolResponseMessage.getResponses()) {
      emitToolResult(response.name(), response.responseData());
    }
    var results =
        toolResponseMessage.getResponses().stream()
            .map(
                response ->
                    "Tool " + response.name() + " returned result: " + response.responseData())
            .collect(Collectors.joining("\n"));
    log.info(results);
    return results;
  }
}
