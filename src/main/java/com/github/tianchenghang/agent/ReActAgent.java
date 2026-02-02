package com.github.tianchenghang.agent;

import cn.hutool.core.util.StrUtil;
import java.util.HashMap;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

// ReAct (Reasoning and Acting)
@EqualsAndHashCode(callSuper = true)
@Data
@Slf4j
public abstract class ReActAgent extends BaseAgent {
  public abstract boolean think();

  public abstract String act();

  protected void emitThinking(String content) {
    if (StrUtil.isNotBlank(content)) {
      sendSseMessage(EventNames.THINKING, content);
    }
  }

  protected void emitToolCall(String toolName, String args) {
    var data = new HashMap<String, Object>();
    data.put("tool", toolName);
    data.put("args", args);
    sendSseMessage(EventNames.TOOL_CALL, data);
  }

  protected void emitToolResult(String toolName, String result) {
    var data = new HashMap<String, Object>();
    data.put("tool", toolName);
    data.put("result", result);
    sendSseMessage(EventNames.TOOL_RESULT, data);
  }

  @Override
  public String step() {
    try {
      var shouldAct = think();
      if (!shouldAct) {
        return "Thinking complete - no action required.";
      }
      return act();
    } catch (Exception e) {
      e.printStackTrace();
      return "Step execute failed:" + e.getMessage();
    }
  }
}
