import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document, type DocumentInterface } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getConfig, logger } from "../config";

function createEmbeddings(): Embeddings {
  const cfg = getConfig();
  const { ai: aiConfig, rag: ragConfig } = cfg;

  return new OllamaEmbeddings({
    baseUrl: aiConfig.base_url,
    model: ragConfig.embedding_model,
  });
}

// --- DocumentLoader ---
export class DocumentLoader {
  private username: string;

  constructor(username: string) {
    this.username = username;
  }

  async loadAndSplit(docsPath: string): Promise<Document[]> {
    const docs = this.loadFromDirectory(docsPath);
    if (docs.length === 0) {
      return [];
    }
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    return splitDocs;
  }

  loadFromDirectory(docsPath: string): Document[] {
    const documents: Document[] = [];
    if (!existsSync(docsPath)) {
      logger.warn({ docsPath }, "Documents path not found");
      return documents;
    }
    const files = readdirSync(docsPath);
    for (const file of files) {
      if ([".md", ".txt", ".json"].some((ext) => file.endsWith(ext))) {
        const filepath = join(docsPath, file);
        try {
          const content = readFileSync(filepath, "utf-8");
          documents.push(
            new Document({
              pageContent: content,
              metadata: { source: filepath, file_name: file },
            }),
          );
          logger.debug({ file }, "Loaded document");
        } catch (err) {
          logger.error({ file, err }, "Failed to load file");
        }
      }
    }
    return documents;
  }
}

// --- DocumentRetriever ---
export class DocumentRetriever {
  private vectorStore: MemoryVectorStore;

  constructor(vectorStore: MemoryVectorStore) {
    this.vectorStore = vectorStore;
  }

  async retrieveDocuments(query: string): Promise<DocumentInterface[]> {
    const results = await this.vectorStore.similaritySearchWithScore(
      query,
      5 /** k */,
    );
    return results.map(([doc]) => doc);
  }
}

export async function newDocumentRetriever(
  username: string,
): Promise<DocumentRetriever> {
  const docsPath = join("uploads", username);
  if (!existsSync(docsPath)) {
    throw new Error(`Uploaded files not found for user ${username}`);
  }

  const loader = new DocumentLoader(username);
  const docs = await loader.loadAndSplit(docsPath);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    createEmbeddings(),
  );
  return new DocumentRetriever(vectorStore);
}

export function buildRagPrompt(
  userMessage: string,
  docs: DocumentInterface[],
): string {
  if (docs.length === 0) return userMessage;

  let contextText = "";
  for (let i = 0; i < docs.length; i++) {
    contextText += `[Document ${i + 1}]: ${docs[i].pageContent}\n\n`;
  }

  return `
Answer the user's question based on the following reference document. If the document does not contain the relevant information, please state that the information could not be found.

Reference Document:
${contextText}

User Question: ${userMessage}

Please provide an accurate and complete answer:`;
}
