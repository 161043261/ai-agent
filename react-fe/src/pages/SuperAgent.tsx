import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatRoom, type Message } from '@/components/ChatRoom';
import { AppFooter } from '@/components/AppFooter';
import { chatWithManus } from '@/api';
import type { ConnectionStatus } from '@/hooks/useSSE';

// 结构化消息类型
interface StructuredMessage {
  type: string;
  content?: string;
  tool?: string;
  result?: string;
}

export function SuperAgent() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  // 添加消息
  const addMessage = useCallback(
    (content: string, isUser: boolean, type = '') => {
      setMessages((prev) => [
        ...prev,
        { content, isUser, type, time: Date.now() },
      ]);
    },
    []
  );

  // 处理结构化消息
  const handleStructuredMessage = useCallback(
    (msg: StructuredMessage) => {
      switch (msg.type) {
        case 'thinking':
          if (msg.content?.trim()) {
            addMessage(`💭 ${msg.content}`, false, 'ai-thinking');
          }
          break;
        case 'tool_call':
          addMessage(`🔧 调用工具: ${msg.tool}`, false, 'ai-tool-call');
          break;
        case 'tool_result': {
          const result =
            msg.result && msg.result.length > 200
              ? msg.result.substring(0, 200) + '...'
              : msg.result;
          addMessage(`📋 ${msg.tool} 结果: ${result}`, false, 'ai-tool-result');
          break;
        }
        case 'finished':
          addMessage(`✅ ${msg.content}`, false, 'ai-final');
          break;
        case 'error':
          addMessage(`❌ ${msg.content}`, false, 'ai-error');
          break;
        default:
          if (msg.content) {
            addMessage(msg.content, false);
          }
      }
    },
    [addMessage]
  );

  // 发送消息
  const handleSendMessage = useCallback(
    (message: string) => {
      // 添加用户消息
      addMessage(message, true, 'user-question');

      // 关闭之前的连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 建立 SSE 连接
      setConnectionStatus('connecting');
      const eventSource = chatWithManus(message);
      eventSourceRef.current = eventSource;

      // 消息缓冲
      let messageBuffer: string[] = [];
      const chineseEndPunctuation = ['。', '！', '？', '…'];

      // 创建消息气泡
      const createBubble = (content: string, type = 'ai-answer') => {
        if (content.trim()) {
          addMessage(content, false, type);
        }
        messageBuffer = [];
      };

      eventSource.onmessage = (event) => {
        const data = event.data;

        if (data && data !== '[DONE]') {
          try {
            // 尝试解析 JSON 格式
            const parsed = JSON.parse(data) as StructuredMessage;
            handleStructuredMessage(parsed);
          } catch {
            // 兼容纯文本消息
            messageBuffer.push(data);
            const combinedText = messageBuffer.join('');
            const lastChar = data.charAt(data.length - 1);
            const hasCompleteSentence =
              chineseEndPunctuation.includes(lastChar) || data.includes('\n\n');
            const isLongEnough = combinedText.length > 40;

            if (hasCompleteSentence || isLongEnough) {
              createBubble(combinedText);
            }
          }
        }

        if (data === '[DONE]') {
          // 处理剩余内容
          if (messageBuffer.length > 0) {
            createBubble(messageBuffer.join(''), 'ai-final');
          }
          setConnectionStatus('disconnected');
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        if (messageBuffer.length > 0) {
          createBubble(messageBuffer.join(''), 'ai-error');
        }
        setConnectionStatus('error');
        eventSource.close();
      };
    },
    [addMessage, handleStructuredMessage]
  );

  // 初始化欢迎消息
  useEffect(() => {
    addMessage(
      '你好，我是 AI 超级智能体！我可以解答各类问题，提供专业建议，请问有什么可以帮助你的吗？',
      false
    );

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [addMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-gray-800">AI 超级智能体</h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <ChatRoom
          messages={messages}
          connectionStatus={connectionStatus}
          aiType="super"
          onSendMessage={handleSendMessage}
        />
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
