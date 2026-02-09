import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { chatWithSse } from "./api";
import ChatMessage from "./components/chat-message";
import ChatInput from "./components/chat-input";
import {
  Code2,
  Lightbulb,
  Map,
  BookOpen,
  CircleHelp,
  AlertCircle,
} from "lucide-react";

interface IMessage {
  content: string;
  role: "ai" | "user";
  timestamp: number;
}

function App() {
  const memoryId = useRef<number>(0);
  const eventSource = useRef<EventSource | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>("");

  const aiResponseRef = useRef<string>("");

  const [connError, setConnError] = useState<boolean>(false);

  useEffect(() => {
    memoryId.current = Date.now();
    return () => {
      if (eventSource.current) {
        eventSource.current.close();
      }
    };
  }, []);

  const aiResponseRendered = useMemo(() => {
    if (!aiResponse) {
      return "";
    }
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    return marked(aiResponse);
  }, [aiResponse]);

  const sendMessage = (userMessage: string) => {
    addMessage(userMessage, "user");
    startAiResponse(userMessage);
  };

  const addMessage = (content: string, role: "ai" | "user") => {
    const message: IMessage = {
      content,
      role,
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now(),
    };
    setMessages((messages) => [...messages, message]);
    scrollToBottom();
  };

  const startAiResponse = (userMessage: string) => {
    setIsAiThinking(true);
    setAiResponse("");
    setConnError(false);
    if (eventSource.current) {
      eventSource.current.close();
    }
    eventSource.current = chatWithSse(
      memoryId.current,
      userMessage,
      handleAiMessage,
      handleAiError,
      handleAiClose,
    );
  };

  const handleAiMessage = (chunk: string) => {
    setAiResponse((resp) => {
      const newResp = resp + chunk;
      aiResponseRef.current = newResp;
      return newResp;
    });
    scrollToBottom();
  };

  const handleAiError = (err: unknown) => {
    console.error(err);
    setConnError(true);
    handleAiClose();
    setTimeout(() => {
      setConnError(false);
    }, 5000);
  };

  const handleAiClose = () => {
    const finalAiResp = aiResponseRef.current;
    if (finalAiResp.trim()) {
      addMessage(finalAiResp.trim(), "ai");
    }
    setIsAiThinking(false);
    setAiResponse("");
    aiResponseRef.current = "";
    setConnError(false);
    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = null;
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  };

  return (
    <div className="from-primary-50 min-h-screen bg-linear-to-b to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="from-primary-400 to-primary-600 shadow-apple flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br">
              <Code2 className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-700">编程专家</h1>
              <p className="text-xs text-gray-400">AI 智能编程助手</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 pb-36">
        {/* Welcome Section */}
        {messages.length === 0 && (
          <div className="py-12">
            <div className="mb-10 text-center">
              <div className="from-primary-300 to-primary-500 shadow-apple-lg mb-6 inline-flex h-20 w-20 items-center justify-center rounded-lg bg-linear-to-br">
                <Lightbulb className="h-10 w-10 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-gray-700">
                你好, 我是编程专家
              </h2>
              <p className="text-gray-400">
                你可以叫我神人, 我可以帮你解决编程问题
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="group hover:border-primary-300 hover:shadow-apple cursor-pointer rounded-lg border border-gray-200 bg-white p-5 transition-all duration-300">
                <div className="bg-primary-100 text-primary-600 group-hover:bg-primary-500 mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:text-white">
                  <Map className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mb-1 font-medium text-gray-700">学习路线</h3>
                <p className="text-sm text-gray-400">
                  为你规划专属的编程学习路线
                </p>
              </div>

              <div className="group hover:border-primary-300 hover:shadow-apple cursor-pointer rounded-lg border border-gray-200 bg-white p-5 transition-all duration-300">
                <div className="bg-primary-100 text-primary-600 group-hover:bg-primary-500 mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:text-white">
                  <BookOpen className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mb-1 font-medium text-gray-700">学习建议</h3>
                <p className="text-sm text-gray-400">
                  提供针对性的编程学习建议
                </p>
              </div>

              <div className="group hover:border-primary-300 hover:shadow-apple cursor-pointer rounded-lg border border-gray-200 bg-white p-5 transition-all duration-300">
                <div className="bg-primary-100 text-primary-600 group-hover:bg-primary-500 mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:text-white">
                  <CircleHelp className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mb-1 font-medium text-gray-700">面试题</h3>
                <p className="text-sm text-gray-400">分享高频编程面试题解析</p>
              </div>
            </div>

            {/* Prompt */}
            <div className="mt-10 text-center">
              <p className="text-sm text-gray-400">
                请在下方输入你的问题, 开始对话
              </p>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div ref={containerRef} className="space-y-4 py-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.timestamp}
              content={message.content}
              role={message.role}
              timestamp={message.timestamp}
            />
          ))}

          {/* AI Thinking */}
          {isAiThinking && (
            <div className="flex gap-3">
              <div className="from-primary-400 to-primary-600 shadow-apple flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br">
                <Code2 className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="shadow-apple mb-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
                  <div className="flex gap-1">
                    <span
                      className="bg-primary-400 h-2 w-2 animate-bounce rounded-full"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="bg-primary-400 h-2 w-2 animate-bounce rounded-full"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="bg-primary-400 h-2 w-2 animate-bounce rounded-full"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                  <span className="text-sm text-gray-400">AI 正在思考...</span>
                </div>
                {aiResponse && (
                  <div className="shadow-apple rounded-lg border border-gray-200 bg-white p-4">
                    <div
                      className="markdown-content text-gray-600"
                      dangerouslySetInnerHTML={{ __html: aiResponseRendered }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Input Area */}
      <div className="fixed right-0 bottom-0 left-0 bg-linear-to-t from-white via-white to-transparent pt-6 pb-6">
        <div className="mx-auto max-w-3xl px-6">
          <ChatInput
            disabled={isAiThinking}
            placeholder="请输入你的编程问题..."
            sendMessage={sendMessage}
          />

          {/* Error Toast */}
          {connError && (
            <div className="shadow-apple absolute bottom-full left-1/2 mb-4 flex -translate-x-1/2 animate-pulse items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" strokeWidth={2} />
              服务器连接错误, 请稍后重试
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
