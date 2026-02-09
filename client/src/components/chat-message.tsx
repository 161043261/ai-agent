import { marked } from "marked";
import { useMemo } from "react";
import { Code2, User } from "lucide-react";

interface IProps {
  content: string;
  role: "ai" | "user";
  timestamp: number;
}

export default function ChatMessage(props: IProps) {
  const { content, role, timestamp } = props;

  const renderedMessage = useMemo(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    return marked(content);
  }, [content]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="flex max-w-[80%] flex-col items-end">
          <div className="from-primary-500 to-primary-600 shadow-apple rounded-lg rounded-tr-sm bg-linear-to-br px-4 py-3 text-white">
            <pre className="m-0 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </pre>
          </div>
          <span className="mt-1.5 mr-1 text-xs text-gray-400">
            {formatTime(timestamp)}
          </span>
        </div>
        <div className="from-primary-200 to-primary-300 shadow-apple flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br">
          <User className="text-primary-700 h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="from-primary-400 to-primary-600 shadow-apple flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br">
        <Code2 className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <div className="flex max-w-[80%] flex-col">
        <div className="shadow-apple rounded-lg rounded-tl-sm border border-gray-200 bg-white p-4">
          <div
            className="markdown-content text-sm text-gray-600"
            dangerouslySetInnerHTML={{ __html: renderedMessage }}
          />
        </div>
        <span className="mt-1.5 ml-1 text-xs text-gray-400">
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
