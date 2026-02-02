package com.github.tianchenghang.tools;

import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ToolRegister {

  @Value("${search-api.api-key}")
  private String searchApiKey;

  @Bean
  public ToolCallback[] allTools() {
    var fileOperationTool = new FileOperationTool();
    //    var webSearchTool = new WebSearchTool(searchApiKey);
    var webScrapeTool = new WebScrapeTool();
    var resourceDownloadTool = new ResourceDownloadTool();
    var terminalOperationTool = new TerminalOperationTool();
    var pdfGenerateTool = new PdfGenerateTool();
    var terminateTool = new TerminateTool();
    return ToolCallbacks.from(
        fileOperationTool,
        //        webSearchTool,
        webScrapeTool,
        resourceDownloadTool,
        terminalOperationTool,
        pdfGenerateTool,
        terminateTool);
  }
}
