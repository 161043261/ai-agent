package com.github.tianchenghang.ai.tools;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

@Slf4j
public class CodeQuestionTool {

  @Tool(
      name = "CodeQuestionTool",
      value =
          """
      Find relevant code questions based on a keyword.
      Use this tool when the user asks for code questions.
      The input should be a clear search keyword.
      """)
  public String searchCodeQuestions(@P(value = "The keyword to search") String keyword) {
    var questions = new ArrayList<String>();
    var encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
    var url = "https://leetcode.cn/search/?q=" + encodedKeyword;
    log.info("Found relevant code questions from leetcode.cn for keyword: {}", keyword);
    Document doc;
    try {
      doc = Jsoup.connect(url).userAgent("Mozilla/5.0").timeout(5000).get();
    } catch (IOException err) {
      log.error("Error connecting to leetcode.cn", err);
      return err.getMessage();
    }
    var elems = doc.select("a");
    elems.forEach(el -> questions.add(el.text().trim()));
    return String.join("\n", questions);
  }
}
