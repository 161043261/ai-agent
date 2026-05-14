import type { Message } from "@/types";
import { Sparkles, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";

interface Props {
  message: Message;
}

function MessageItem({ message }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex gap-4 ${
        message.role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          message.role === "user" ? "bg-primary" : "bg-primary/10"
        }`}
      >
        {message.role === "user" ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Sparkles className="text-primary h-5 w-5" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              message.role === "user"
                ? "text-primary ml-auto"
                : "text-base-content"
            }`}
          >
            {message.role === "user" ? t("chat.you") : t("chat.ai")}
          </span>

          {message.status === "thinking" && (
            <span className="text-primary text-xs">{t("chat.thinking")}</span>
          )}
        </div>
        <div
          className={`inline-block max-w-full rounded-2xl px-4 py-3 wrap-break-word ${
            message.role === "user"
              ? "bg-primary text-left text-white"
              : "bg-base-200 text-base-content"
          }`}
        >
          {message.status === "thinking" ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="bg-base-content/40 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
              <span className="bg-base-content/40 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
              <span className="bg-base-content/20 h-2 w-2 animate-bounce rounded-full" />
            </div>
          ) : (
            <div className="prose prose-sm [&_code]:bg-base-200 &_code]:bg-base-300 [&_pre]:bg-base-100 &_pre]:bg-base-300 max-w-none text-sm leading-relaxed wrap-break-word [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_pre]:rounded-lg [&_pre]:p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageItem;
