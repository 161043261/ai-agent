import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Send } from "lucide-react";

interface IProps {
  disabled: boolean;
  sendMessage: (message: string) => void;
  placeholder?: string;
}

export default function ChatInput(props: IProps) {
  const { disabled, placeholder = "请输入你的编程问题", sendMessage } = props;
  const [inputMessage, setInputMessage] = useState<string>("");

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && !disabled) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
      adjustHeight();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 正常输入也会触发 keydown 事件
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      }
    });
  };

  useEffect(() => {
    adjustHeight();
  }, []);

  const canSend = !disabled && inputMessage.trim();

  return (
    <div className="shadow-apple-lg focus-within:border-primary-300 focus-within:ring-primary-100 relative flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 focus-within:ring-4">
      <textarea
        ref={textareaRef}
        value={inputMessage}
        onChange={handleInput}
        onInput={adjustHeight}
        disabled={disabled}
        rows={1}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="scrollbar-thin max-h-50 flex-1 resize-none border-none bg-transparent text-sm leading-relaxed text-gray-700 placeholder-gray-400 outline-none"
      />
      <button
        disabled={!canSend}
        onClick={handleSendMessage}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out ${
          canSend
            ? "from-primary-500 to-primary-600 shadow-apple hover:shadow-apple-lg bg-linear-to-br text-white hover:scale-105 active:scale-95"
            : "cursor-not-allowed bg-gray-100 text-gray-300"
        } `}
      >
        <Send className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
