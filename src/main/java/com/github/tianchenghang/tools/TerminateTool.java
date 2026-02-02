package com.github.tianchenghang.tools;

import org.springframework.ai.tool.annotation.Tool;

/** Termination tool (allows autonomous planning agents to gracefully interrupt execution). */
public class TerminateTool {

  @Tool(
      description =
          """
      Terminate the interaction when the request is met or if the assistant cannot proceed further with the task.
      Call this tool when all tasks are completed to end the session.
      """)
  public String doTerminate() {
    return "Task completed";
  }
}
