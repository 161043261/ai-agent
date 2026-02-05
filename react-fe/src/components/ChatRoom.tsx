import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AiAvatar } from '@/components/AiAvatar';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/useSSE';

export interface Message {
  content: string;
  isUser: boolean;
  type?: string;
  time: number;
}

interface ChatRoomProps {
  messages: Message[];
  connectionStatus: ConnectionStatus;
  aiType?: 'code' | 'super' | 'default';
  onSendMessage: (message: string) => void;
}

export function ChatRoom({
  messages,
  connectionStatus,
  aiType = 'default',
  onSendMessage,
}: ChatRoomProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 发送消息
  const handleSend = () => {
    if (!inputMessage.trim() || connectionStatus === 'connecting') return;
    onSendMessage(inputMessage);
    setInputMessage('');
  };

  // 键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 获取消息气泡样式
  const getBubbleClass = (type?: string) => {
    switch (type) {
      case 'ai-thinking':
        return 'bg-amber-50 border-l-4 border-amber-400 italic';
      case 'ai-tool-call':
        return 'bg-gray-100 border-l-4 border-gray-400 text-sm';
      case 'ai-tool-result':
        return 'bg-sky-50 border-l-4 border-sky-400 text-sm max-h-36 overflow-y-auto';
      case 'ai-final':
        return 'bg-emerald-50 border-l-4 border-emerald-400';
      case 'ai-error':
        return 'bg-red-50 border-l-4 border-red-400';
      default:
        return 'bg-gray-100';
    }
  };

  const isConnecting = connectionStatus === 'connecting';

  return (
    <div className="flex flex-col h-[70vh] min-h-[500px] bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3',
                msg.isUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* 头像 */}
              {msg.isUser ? (
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-emerald-500 text-white">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <AiAvatar type={aiType} />
              )}

              {/* 消息气泡 */}
              <div
                className={cn(
                  'max-w-[75%] px-4 py-3 rounded-2xl',
                  msg.isUser
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : cn('rounded-bl-md', getBubbleClass(msg.type))
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                  {/* 打字指示器 */}
                  {!msg.isUser &&
                    isConnecting &&
                    index === messages.length - 1 && (
                      <span className="inline-block ml-1 animate-pulse">▋</span>
                    )}
                </p>
                <p
                  className={cn(
                    'text-xs mt-1.5',
                    msg.isUser ? 'text-emerald-100' : 'text-gray-400'
                  )}
                >
                  {formatTime(msg.time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="p-4 border-t border-emerald-50 bg-gray-50/50">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={isConnecting}
            className={cn(
              'flex-1 resize-none rounded-xl border border-emerald-200 px-4 py-3',
              'text-sm placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[44px] max-h-[120px]'
            )}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={isConnecting || !inputMessage.trim()}
            className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
