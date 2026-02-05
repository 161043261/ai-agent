import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatRoom, type Message } from '@/components/ChatRoom';
import { AppFooter } from '@/components/AppFooter';
import { chatWithCodePill } from '@/api';
import type { ConnectionStatus } from '@/hooks/useSSE';

// 生成随机会话 ID
const generateChatId = () => 'code_' + Math.random().toString(36).substring(2, 10);

export function CodePill() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId] = useState(generateChatId);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  // 添加消息
  const addMessage = useCallback((content: string, isUser: boolean) => {
    setMessages((prev) => [
      ...prev,
      { content, isUser, time: Date.now() },
    ]);
  }, []);

  // 更新最后一条 AI 消息
  const updateLastAiMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0 && !newMessages[lastIndex].isUser) {
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: newMessages[lastIndex].content + content,
        };
      }
      return newMessages;
    });
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(
    (message: string) => {
      // 添加用户消息
      addMessage(message, true);

      // 关闭之前的连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 添加空的 AI 消息占位
      addMessage('', false);

      // 建立 SSE 连接
      setConnectionStatus('connecting');
      const eventSource = chatWithCodePill(message, chatId);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = event.data;
        if (data && data !== '[DONE]') {
          updateLastAiMessage(data);
        }
        if (data === '[DONE]') {
          setConnectionStatus('disconnected');
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus('error');
        eventSource.close();
      };
    },
    [chatId, addMessage, updateLastAiMessage]
  );

  // 初始化欢迎消息
  useEffect(() => {
    addMessage('欢迎来到 AI 编程魔丸！请告诉我你的编程问题，我会尽力帮助你。', false);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [addMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-emerald-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-gray-800">AI 编程魔丸</h1>
          </div>

          <div className="text-xs text-gray-400 hidden sm:block">
            会话: {chatId}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <ChatRoom
          messages={messages}
          connectionStatus={connectionStatus}
          aiType="code"
          onSendMessage={handleSendMessage}
        />
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
