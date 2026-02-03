package com.github.tianchenghang.tools;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import java.util.HashMap;
import java.util.stream.Collectors;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class WebSearchTool {

  private static final String SEARCH_API_URL = "https://www.searchapi.io/api/v1/search";

  private final String apiKey;

  public WebSearchTool(String apiKey) {
    this.apiKey = apiKey;
  }

  @Tool(description = "Search for information from web search engine")
  public String searchWeb(@ToolParam(description = "Search query keyword") String query) {
    var paramMap = new HashMap<String, Object>();
    paramMap.put("q", query);
    paramMap.put("api_key", apiKey);
    paramMap.put("engine", "google");
    try {
      var response = HttpUtil.get(SEARCH_API_URL, paramMap);
      // Extract top 5 results
      var jsonObject = JSONUtil.parseObj(response);
      var organicResults = jsonObject.getJSONArray("organic_results");
      var objects = organicResults.subList(0, 5);
      // Format search results as a string
      var result =
          objects.stream()
              .map(
                  obj -> {
                    var tmpJsonObj = (JSONObject) obj;
                    return tmpJsonObj.toString();
                  })
              .collect(Collectors.joining(","));
      return result;
    } catch (Exception e) {
      return "Error searching web: " + e.getMessage();
    }
  }
}
