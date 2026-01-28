package com.yupi.yuaiagent.agent;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.yupi.yuaiagent.agent.model.AgentState;
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

/**
 * 抽象基础代理类, 用于管理代理状态和执行流程;
 *
 * <p>提供状态转换、内存管理和基于步骤的执行循环的基础功能; 子类必须实现step方法;
 */
@Data
@Slf4j
public abstract class BaseAgent {

  // 核心属性
  private String name;

  // 提示词
  private String systemPrompt;
  private String nextStepPrompt;

  // 代理状态
  private AgentState state = AgentState.IDLE;

  // 执行步骤控制
  private int currentStep = 0;
  private int maxSteps = 10;

  // LLM 大模型
  private ChatClient chatClient;

  // Memory 记忆 (需要自主维护会话上下文)
  private List<Message> messageList = new ArrayList<>();

  // SSE 发射器 (用于流式输出)
  protected SseEmitter sseEmitter;

  /** 发送 SSE 结构化消息 */
  protected void sendSseMessage(String type, Map<String, Object> data) {
    if (sseEmitter != null) {
      try {
        Map<String, Object> message = new HashMap<>();
        message.put("type", type);
        message.putAll(data);
        sseEmitter.send(JSONUtil.toJsonStr(message));
      } catch (IOException e) {
        log.error("Failed to send SSE message", e);
      }
    }
  }

  /** 发送简单的 SSE 消息 */
  protected void sendSseMessage(String type, String content) {
    Map<String, Object> data = new HashMap<>();
    data.put("content", content);
    sendSseMessage(type, data);
  }

  /**
   * 运行代理
   *
   * @param userPrompt 用户提示词
   * @return 执行结果
   */
  public String run(String userPrompt) {
    // 1、基础校验
    if (this.state != AgentState.IDLE) {
      throw new RuntimeException("Cannot run agent from state: " + this.state);
    }
    if (StrUtil.isBlank(userPrompt)) {
      throw new RuntimeException("Cannot run agent with empty user prompt");
    }
    // 2、执行, 更改状态
    this.state = AgentState.RUNNING;
    // 记录消息上下文
    messageList.add(new UserMessage(userPrompt));
    // 保存结果列表
    List<String> results = new ArrayList<>();
    try {
      // 执行循环
      for (int i = 0; i < maxSteps && state != AgentState.FINISHED; i++) {
        int stepNumber = i + 1;
        currentStep = stepNumber;
        log.info("Executing step {}/{}", stepNumber, maxSteps);
        // 单步执行
        String stepResult = step();
        String result = "Step " + stepNumber + ": " + stepResult;
        results.add(result);
      }
      // 检查是否超出步骤限制
      if (currentStep >= maxSteps) {
        state = AgentState.FINISHED;
        results.add("Terminated: Reached max steps (" + maxSteps + ")");
      }
      return String.join("\n", results);
    } catch (Exception e) {
      state = AgentState.ERROR;
      log.error("error executing agent", e);
      return "执行错误" + e.getMessage();
    } finally {
      // 3、清理资源
      this.cleanup();
    }
  }

  /**
   * 运行代理 (流式输出)
   *
   * @param userPrompt 用户提示词
   * @return 执行结果
   */
  public SseEmitter runStream(String userPrompt) {
    // 创建一个超时时间较长的 SseEmitter
    SseEmitter emitter = new SseEmitter(300000L); // 5 分钟超时
    this.sseEmitter = emitter;

    // 使用线程异步处理, 避免阻塞主线程
    CompletableFuture.runAsync(
        () -> {
          // 1、基础校验
          try {
            if (this.state != AgentState.IDLE) {
              sendSseMessage("error", "无法从状态运行代理：" + this.state);
              emitter.complete();
              return;
            }
            if (StrUtil.isBlank(userPrompt)) {
              sendSseMessage("error", "不能使用空提示词运行代理");
              emitter.complete();
              return;
            }
          } catch (Exception e) {
            emitter.completeWithError(e);
          }
          // 2、执行, 更改状态
          this.state = AgentState.RUNNING;
          // 记录消息上下文
          messageList.add(new UserMessage(userPrompt));
          // 保存结果列表
          List<String> results = new ArrayList<>();
          try {
            // 执行循环
            for (int i = 0; i < maxSteps && state != AgentState.FINISHED; i++) {
              int stepNumber = i + 1;
              currentStep = stepNumber;
              log.info("Executing step {}/{}", stepNumber, maxSteps);

              // 发送步骤开始事件
              Map<String, Object> stepStartData = new HashMap<>();
              stepStartData.put("step", stepNumber);
              stepStartData.put("maxSteps", maxSteps);
              sendSseMessage("step_start", stepStartData);

              // 单步执行
              String stepResult = step();
              String result = "Step " + stepNumber + ": " + stepResult;
              results.add(result);

              // 发送步骤结果
              Map<String, Object> stepResultData = new HashMap<>();
              stepResultData.put("step", stepNumber);
              stepResultData.put("content", stepResult);
              sendSseMessage("step_result", stepResultData);
            }
            // 检查是否超出步骤限制
            if (currentStep >= maxSteps) {
              state = AgentState.FINISHED;
              results.add("Terminated: Reached max steps (" + maxSteps + ")");
              sendSseMessage("finished", "达到最大步骤 (" + maxSteps + ")");
            }
            // 正常完成
            emitter.complete();
          } catch (Exception e) {
            state = AgentState.ERROR;
            log.error("error executing agent", e);
            try {
              sendSseMessage("error", "执行错误：" + e.getMessage());
              emitter.complete();
            } catch (Exception ex) {
              emitter.completeWithError(ex);
            }
          } finally {
            // 3、清理资源
            this.sseEmitter = null;
            this.cleanup();
          }
        });

    // 设置超时回调
    emitter.onTimeout(
        () -> {
          this.state = AgentState.ERROR;
          this.sseEmitter = null;
          this.cleanup();
          log.warn("SSE connection timeout");
        });
    // 设置完成回调
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

  /**
   * 定义单个步骤
   *
   * @return
   */
  public abstract String step();

  /** 清理资源 */
  protected void cleanup() {
    // 子类可以重写此方法来清理资源
  }
}
