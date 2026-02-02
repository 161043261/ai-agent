package com.github.tianchenghang.tools;

import cn.hutool.core.io.FileUtil;
import com.github.tianchenghang.constants.FileConstant;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class FileOperationTool {

  private final String FILE_OUTPUT_DIR = FileConstant.FILE_OUTPUT_DIR + "/file";

  @Tool(description = "Read content from a file")
  public String readFile(@ToolParam(description = "Name of the file to read") String filename) {
    var filepath = FILE_OUTPUT_DIR + "/" + filename;
    try {
      return FileUtil.readUtf8String(filepath);
    } catch (Exception e) {
      return "Error reading file: " + e.getMessage();
    }
  }

  @Tool(description = "Write content to a file")
  public String writeFile(
      @ToolParam(description = "Name of the file to write") String filename,
      @ToolParam(description = "Content to write to the file") String content) {
    var filepath = FILE_OUTPUT_DIR + "/" + filename;

    try {
      FileUtil.mkdir(FILE_OUTPUT_DIR);
      FileUtil.writeUtf8String(content, filepath);
      return "File written successfully to: " + filepath;
    } catch (Exception e) {
      return "Error writing to file: " + e.getMessage();
    }
  }
}
