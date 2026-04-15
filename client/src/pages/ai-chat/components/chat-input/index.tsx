import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";

interface Props {
  loading: boolean;
  onSend: (message: string) => void;
}

function ChatInput({ loading, onSend }: Props) {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim() || loading) return;
    onSend(inputMessage);
    setInputMessage("");
  };

  return (
    <div className="border-base-200 bg-base-100 border-t p-4">
      <div className="mx-auto max-w-3xl">
        <div className="bg-base-200 focus-within:border-primary focus-within:bg-base-100 relative flex items-center rounded-full border border-transparent transition-all">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.input_placeholder")}
            disabled={loading}
            rows={1}
            className="text-base-content placeholder-base-content/50 max-h-30 flex-1 resize-none bg-transparent px-6 py-3 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={inputMessage.trim().length === 0 || loading}
            className="btn btn-circle bg-primary disabled:bg-base-200 mr-2 h-10 min-h-10 w-10 border-none hover:brightness-90 disabled:opacity-100"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
        <p className="text-base-content/70 mt-2 text-center text-xs">
          {t("chat.send_hint")}
        </p>
      </div>
    </div>
  );
}

export default ChatInput;
