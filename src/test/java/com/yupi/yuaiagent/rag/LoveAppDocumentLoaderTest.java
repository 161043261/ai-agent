package com.yupi.yuaiagent.rag;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class LoveAppDocumentLoaderTest {

  @Resource private LoveAppDocumentLoader loveAppDocumentLoader;

  @Test
  void loadMarkdowns() {
    loveAppDocumentLoader.loadMarkdowns();
  }
}
