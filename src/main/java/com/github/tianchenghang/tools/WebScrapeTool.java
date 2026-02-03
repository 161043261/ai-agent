package com.github.tianchenghang.tools;

import org.jsoup.Jsoup;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class WebScrapeTool {

  @Tool(description = "Scrape the content of a web page")
  public String scrapeWebPage(
      @ToolParam(description = "Url of the web page to scrape") String url) {
    try {
      var document = Jsoup.connect(url).get();
      return document.html();
    } catch (Exception e) {
      return "Error scraping web page: " + e.getMessage();
    }
  }
}
