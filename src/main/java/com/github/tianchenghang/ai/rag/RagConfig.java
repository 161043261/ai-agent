package com.github.tianchenghang.ai.rag;

import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.splitter.DocumentByParagraphSplitter;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RagConfig {

  @Resource private EmbeddingModel embeddingModel;

  @Resource private EmbeddingStore<TextSegment> embeddingStore;

  @Bean
  public ContentRetriever contentRetriever() {
    // 加载 markdown 文档
    var docs = FileSystemDocumentLoader.loadDocuments("src/main/resources/docs/base");
    // [DEBUG] 文档切片: 每个文档按段落切片, 最大 1000 个字符, 最多重叠 200 个字符
    var splitter =
        new DocumentByParagraphSplitter(
            1000, // maxSegmentSizeInChars
            200); // maxOverlapSizeInChars
    // [DEBUG] 文档加载器, 将文档转换为向量并保存到向量数据库中
    var ingestor =
        EmbeddingStoreIngestor.builder()
            .documentSplitter(splitter)
            // 提高文档质量, 为每个切片后的文档段 seg 添加文档名, 作为元信息
            .textSegmentTransformer(
                seg ->
                    TextSegment.from(
                        seg.metadata().getString("file_name") + '\n' + seg.text(), seg.metadata()))
            // 使用向量模型
            .embeddingModel(embeddingModel)
            .embeddingStore(embeddingStore)
            .build();
    // [DEBUG] 加载文档
    ingestor.ingest(docs);
    // [DEBUG] 内容检索器
    var retriever =
        EmbeddingStoreContentRetriever.builder()
            .embeddingStore(embeddingStore)
            .embeddingModel(embeddingModel)
            .maxResults(5) // 最多 5 个结果
            .minScore(0.75) // 过滤分数小于 0.75 的结果
            .build();
    return retriever;
  }
}
