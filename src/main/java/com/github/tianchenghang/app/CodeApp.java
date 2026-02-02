package com.github.tianchenghang.app;

import com.github.tianchenghang.advisor.LoggerAdvisor;
import com.github.tianchenghang.rag.QueryRewriter;
import jakarta.annotation.Resource;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

@Component
@Slf4j
public class CodeApp {
  private final ChatClient chatClient;

  private static final String SYSTEM_PROMPT =
      """
    You are a programming expert, and your name is [MoWan];
    Before starting the conversation, ask the user whether they are interested in front-end, back-end, or full-stack development.
    If the user is interested in front-end development, ask if they are familiar with JavaScript, TypeScript, HTML, CSS, npm/yarn/pnpm, Vue, vue-router, Pinia, React, react-router, MobX, Zustand, Jotai, Webpack, Vite, Rollup, etc.
    If the user is interested in back-end development, ask if they are familiar with Express, Koa, Nest.js, Java, Spring Boot, Redis, MongoDB, MySQL, Kafka, ClickHouse, ElasticSearch, etc.
    If the user is interested in full-stack development, ask if they are familiar with Next.js or Nuxt.js.
    Use chinese.
    """;

  public CodeApp(ChatModel dashscopeChatModel) {
    // Initialize file-based chat history.
    // var filedir = System.getProperty("user.dir") + "/tmp/chat-memory";
    // var chatMemory = new FileBasedChatMemory(filedir);

    // Initialize memory-based chat history.
    var chatMemory =
        MessageWindowChatMemory.builder()
            .chatMemoryRepository(new InMemoryChatMemoryRepository())
            .maxMessages(20)
            .build();
    chatClient =
        ChatClient.builder(dashscopeChatModel)
            .defaultSystem(SYSTEM_PROMPT)
            .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(chatMemory).build(), new LoggerAdvisor())
            .build();
  }

  public String doChat(String message, String chatId) {
    var chatResponse =
        chatClient
            .prompt()
            .user(message)
            .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
            .call()
            .chatResponse();
    var content = chatResponse.getResult().getOutput().getText();
    log.info("content: {}", content);
    return content;
  }

  public Flux<String> doChatByStream(String message, String chatId) {
    return chatClient
        .prompt()
        .user(message)
        .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
        .stream()
        .content();
  }

  record CodeReport(String title, List<String> suggestions) {}

  public CodeReport doChatWithReport(String message, String chatId) {
    var codeReport =
        chatClient
            .prompt()
            .system(
                SYSTEM_PROMPT
                    + "Generate a code report after each conversation, titled as {username}'s code report, with content as a list of suggestions")
            .user(message)
            .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
            .call()
            .entity(CodeReport.class);
    log.info("code report: {}", codeReport);
    return codeReport;
  }

  @Resource private VectorStore vectorStore;

  @Resource private Advisor ragCloudAdvisor;

  @Resource private VectorStore pgVectorStore;

  @Resource private QueryRewriter queryRewriter;

  /**
   * Conducts a conversation with the RAG knowledge base.
   *
   * @param message The input message.
   * @param chatId The conversation ID.
   * @return The response from the RAG knowledge base.
   */
  public String doChatWithRag(String message, String chatId) {
    // Query rewriting
    var rewrittenMessage = queryRewriter.doQueryRewrite(message);
    var chatResponse =
        chatClient
            .prompt()
            // Use the rewritten query
            .user(rewrittenMessage)
            .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
            // // Enable logging for observation
            .advisors(new LoggerAdvisor())
            // // Apply RAG knowledge base Q&A
            .advisors(new QuestionAnswerAdvisor(vectorStore))
            // // Apply RAG retrieval augmentation service (cloud-based)
            // .advisors(ragCloudAdvisor)
            // // Apply RAG retrieval augmentation service (PgVector storage)
            // .advisors(new QuestionAnswerAdvisor(pgVectorStore))
            // // Apply custom RAG retrieval augmentation service (document retriever + context
            // augmenter)
            // .advisors(RagCustomAdvisorFactory.createRagCustomAdvisor(vectorStore, "single"))
            .call()
            .chatResponse();
    var content = chatResponse.getResult().getOutput().getText();
    log.info("content: {}", content);
    return content;
  }

  // AI tool invocation capability
  @Resource private ToolCallback[] allTools;

  /**
   * AI relationship report feature (supports tool calls).
   *
   * @param message The input message.
   * @param chatId The conversation ID.
   * @return The response content.
   */
  public String doChatWithTools(String message, String chatId) {
    var chatResponse =
        chatClient
            .prompt()
            .user(message)
            .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
            // Enable logging for observation
            .advisors(new LoggerAdvisor())
            .toolCallbacks(allTools)
            .call()
            .chatResponse();
    var content = chatResponse.getResult().getOutput().getText();
    log.info("content: {}", content);
    return content;
  }

  // AI invokes MCP services
  @Resource private ToolCallbackProvider toolCallbackProvider;

  /**
   * AI relationship report feature (invokes MCP services).
   *
   * @param message The input message.
   * @param chatId The conversation ID.
   * @return The response content.
   */
  public String doChatWithMcp(String message, String chatId) {
    var chatResponse =
        chatClient
            .prompt()
            .user(message)
            .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
            // Enable logging for observation
            .advisors(new LoggerAdvisor())
            .toolCallbacks(toolCallbackProvider)
            .call()
            .chatResponse();
    var content = chatResponse.getResult().getOutput().getText();
    log.info("content: {}", content);
    return content;
  }
}
