package com.github.tianchenghang.tools;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class TerminalOperationTool {

  @Tool(description = "Execute a command in the terminal")
  public String executeTerminalCommand(
      @ToolParam(description = "Command to execute in the terminal") String command) {
    var output = new StringBuilder();
    try {
      var builder = new ProcessBuilder("cmd.exe", "/c", command);
      // var process = Runtime.getRuntime().exec(command);
      var process = builder.start();
      try (var reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) {
          output.append(line).append("\n");
        }
      }
      var exitCode = process.waitFor();
      if (exitCode != 0) {
        output.append("Command execution failed with exit code: ").append(exitCode);
      }
    } catch (IOException | InterruptedException e) {
      output.append("Error executing command: ").append(e.getMessage());
    }
    return output.toString();
  }
}
