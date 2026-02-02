package com.github.tianchenghang.rag;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.rag.Query;
import org.springframework.ai.rag.preretrieval.query.transformation.QueryTransformer;
import org.springframework.ai.rag.preretrieval.query.transformation.RewriteQueryTransformer;
import org.springframework.stereotype.Component;

/** Query rewriter component. */
@Component
public class QueryRewriter {
  private final QueryTransformer queryTransformer;

  public QueryRewriter(ChatModel dashscopeChatModel) {
    var builder = ChatClient.builder(dashscopeChatModel);
    // Create a query rewrite transformer
    queryTransformer = RewriteQueryTransformer.builder().chatClientBuilder(builder).build();
  }

  /**
   * Executes query rewriting.
   *
   * @param prompt The input query prompt.
   * @return The rewritten query.
   */
  public String doQueryRewrite(String prompt) {
    var query = new Query(prompt);
    // Execute query rewriting
    var transformedQuery = queryTransformer.transform(query);
    // Return the rewritten query
    return transformedQuery.text();
  }
}
