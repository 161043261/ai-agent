package com.yupi.yuaiagent.tools;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

public class ResourceDownloadToolTest {

  @Test
  public void testDownloadResource() {
    ResourceDownloadTool tool = new ResourceDownloadTool();
    String url = "https://www.codefather.cn/logo.png";
    String fileName = "logo.png";
    String result = tool.downloadResource(url, fileName);
    assertNotNull(result);
  }
}
