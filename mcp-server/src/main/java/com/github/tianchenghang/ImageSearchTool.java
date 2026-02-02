package com.github.tianchenghang;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

@Service
public class ImageSearchTool {
  private static final String API_KEY = "https://www.pexels.com/zh-cn/api/key/";
  private static final String API_URL = "https://api.pexels.com/v1/search";

  @Tool(description = "search image from web")
  public String searchImage(@ToolParam(description = "Search query keyword") String query) {
    try {
      return String.join(",", searchMediumImages(query));
    } catch (Exception e) {
      return "Error search image: " + e.getMessage();
    }
  }

  public List<String> searchMediumImages(String query) {
    var headers = new HashMap<String, String>();
    headers.put("Authorization", API_KEY);
    var params = new HashMap<String, Object>();
    params.put("query", query);
    var response = HttpUtil.createGet(API_URL).addHeaders(headers).form(params).execute().body();
    return JSONUtil.parseObj(response).getJSONArray("photos").stream()
        .map(photoObj -> (JSONObject) photoObj)
        .map(photoObj -> photoObj.getJSONObject("src"))
        .map(photo -> photo.getStr("medium"))
        .filter(StrUtil::isNotBlank)
        .collect(Collectors.toList());
  }
}
