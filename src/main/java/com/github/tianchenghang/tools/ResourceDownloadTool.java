package com.github.tianchenghang.tools;

import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpUtil;
import com.github.tianchenghang.constants.FileConstant;
import java.io.File;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class ResourceDownloadTool {

  @Tool(description = "Download resource from url")
  public String downloadResource(
      @ToolParam(description = "Url of the resource to download") String url,
      @ToolParam(description = "Downloaded resource filename")
          String filename) {
    var fileDir = FileConstant.FILE_OUTPUT_DIR + "/download";
    var filepath = fileDir + "/" + filename;
    try {
      // Make directory
      FileUtil.mkdir(fileDir);
      HttpUtil.downloadFile(url, new File(filepath));
      return "Resource downloaded successfully to: " + filepath;
    } catch (Exception e) {
      return "Error downloading resource: " + e.getMessage();
    }
  }
}
