使用本地 Ollama（默认）

```bash
# 1. 安装并启动 Ollama
ollama serve

# 2. 拉取模型
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5:7b
# 或使用其他模型：
# ollama pull llama3.2:3b
# ollama pull mistral:7b

ollama pull nomic-embed-text

# 3. 启动项目
cd server
cp .env.example .env
npm install
npm run start:dev
```
