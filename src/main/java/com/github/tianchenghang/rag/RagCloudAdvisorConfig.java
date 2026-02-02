package com.github.tianchenghang.rag;

import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentRetriever;
import com.alibaba.cloud.ai.dashscope.rag.DashScopeDocumentRetrieverOptions;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

public class RagCloudAdvisorConfig {
  @Value("${spring.ai.dashscope.api-key}")
  private String dashScopeApiKey;

  @Bean
  public Advisor loveAppRagCloudAdvisor() {
    var dashScopeApi = DashScopeApi.builder().apiKey(dashScopeApiKey).build();
    var dashScopeDocumentRetriever =
        new DashScopeDocumentRetriever(
            dashScopeApi,
            DashScopeDocumentRetrieverOptions.builder().withIndexName("Code Master").build());
    return RetrievalAugmentationAdvisor.builder()
        .documentRetriever(dashScopeDocumentRetriever)
        .build();
  }
}
