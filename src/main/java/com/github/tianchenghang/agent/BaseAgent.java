package com.github.tianchenghang.agent;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.github.tianchenghang.agent.model.AgentState;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Data
@Slf4j
public abstract class BaseAgent {
  static class EventNames {
    static final String STEP_START = "step-start";
    static final String STEP_RESULT = "step-result";
    static final String FINISHED = "finished";
    static final String ERROR = "error";
    static final String THINKING = "thinking";
    static final String TOOL_CALL = "tool-call";
    static final String TOOL_RESULT = "tool-result";
  }

  private String name;
  private String systemPrompt;
  private String nextStepPrompt;
  private AgentState state = AgentState.IDLE;
  private int currentStep = 0;
  private int maxSteps = 10;
  private ChatClient chatClient;
  private List<Message> messageList = new ArrayList<>();
  protected SseEmitter sseEmitter;

  protected void sendSseMessage(String type, Map<String, Object> data) {
    if (sseEmitter != null) {
      try {
        var message = new HashMap<String, Object>();
        message.put("type", type);
        message.putAll(data);
        sseEmitter.send(JSONUtil.toJsonStr(message));
      } catch (IOException e) {
        log.error("Failed to send SSE message", e);
      }
    }
  }

  protected void sendSseMessage(String type, String content) {
    var data = new HashMap<String, Object>();
    data.put("content", content);
    sendSseMessage(type, data);
  }

  public String run(String userPrompt) {
    if (this.state != AgentState.IDLE) {
      throw new RuntimeException("Cannot run agent from state: " + this.state);
    }
    if (StrUtil.isBlank(userPrompt)) {
      throw new RuntimeException("Cannot run agent with empty user prompt");
    }
    this.state = AgentState.RUNNING;
    messageList.add(new UserMessage(userPrompt));
    var results = new ArrayList<String>();
    try {
      for (var i = 0; i < maxSteps && state != AgentState.FINISHED; i++) {
        var stepNumber = i + 1;
        currentStep = stepNumber;
        log.info("Executing step {}/{}", stepNumber, maxSteps);
        var stepResult = step();
        var result = "Step " + stepNumber + ": " + stepResult;
        results.add(result);
      }
      if (currentStep >= maxSteps) {
        state = AgentState.FINISHED;
        results.add("Terminated, reached max steps (" + maxSteps + ")");
      }
      return String.join("\n", results);
    } catch (Exception e) {
      state = AgentState.ERROR;
      log.error("Executing agent error: ", e);
      return "Executing agent error: " + e.getMessage();
    } finally {
      this.cleanup();
    }
  }

  public abstract String step();

  protected void cleanup() {}

  public SseEmitter runStream(String userPrompt) {
    var emitter = new SseEmitter(300_000L);
    this.sseEmitter = emitter;

    CompletableFuture.runAsync(
        () -> {
          try {
            if (this.state != AgentState.IDLE) {
              sendSseMessage(EventNames.ERROR, "Cannot run agent from state: " + this.state);
              emitter.complete();
              return;
            }
            if (StrUtil.isBlank(userPrompt)) {
              sendSseMessage(EventNames.ERROR, "Cannot run agent with empty user prompt");
              emitter.complete();
              return;
            }
          } catch (Exception e) {
            emitter.completeWithError(e);
          }
          this.state = AgentState.RUNNING;
          messageList.add(new UserMessage(userPrompt));
          var results = new ArrayList<String>();
          try {
            for (var i = 0; i < maxSteps && state != AgentState.FINISHED; i++) {
              var stepNumber = i + 1;
              currentStep = stepNumber;
              log.info("Executing step {}/{}", stepNumber, maxSteps);
              var stepStartData = new HashMap<String, Object>();
              stepStartData.put("step", stepNumber);
              stepStartData.put("max_steps", maxSteps);
              sendSseMessage(EventNames.STEP_START, stepStartData);
              var stepResult = step();
              var result = "Step " + stepNumber + ": " + stepResult;
              results.add(result);
              var stepResultData = new HashMap<String, Object>();
              stepResultData.put("step", stepNumber);
              stepResultData.put("content", stepResult);
              sendSseMessage(EventNames.STEP_RESULT, stepResultData);
            }
            if (currentStep >= maxSteps) {
              state = AgentState.FINISHED;
              results.add("Terminated, reached max steps (" + maxSteps + ")");
              sendSseMessage(
                  EventNames.FINISHED, "Terminated, reached max steps (" + maxSteps + ")");
            }
            emitter.complete();
          } catch (Exception e) {
            state = AgentState.ERROR;
            log.error("Executing agent error: ", e);
            try {
              sendSseMessage(EventNames.ERROR, "Executing agent error: " + e.getMessage());
              emitter.complete();
            } catch (Exception ex) {
              emitter.completeWithError(ex);
            }
          } finally {
            this.sseEmitter = null;
            this.cleanup();
          }
        });

    emitter.onTimeout(
        () -> {
          this.state = AgentState.ERROR;
          this.sseEmitter = null;
          this.cleanup();
          log.warn("SSE connection timeout");
        });

    emitter.onCompletion(
        () -> {
          if (this.state == AgentState.RUNNING) {
            this.state = AgentState.FINISHED;
          }
          this.sseEmitter = null;
          this.cleanup();
          log.info("SSE connection completed");
        });
    return emitter;
  }
}
