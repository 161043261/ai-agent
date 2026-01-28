package com.yupi.yuaiagent.demo.rag;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.annotation.Resource;
import java.util.List;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.ai.rag.Query;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class MultiQueryExpanderDemoTest {

  @Resource private MultiQueryExpanderDemo multiQueryExpanderDemo;

  @Test
  void expand() {
    List<Query> queries = multiQueryExpanderDemo.expand("啥是程序员鱼皮啊啊啊啊啊啊?!请回答我哈哈哈哈");
    Assertions.assertNotNull(queries);
  }
}
