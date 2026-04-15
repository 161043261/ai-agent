import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Sparkles } from "lucide-react";
import type { Message } from "@/types";
import MessageItem from "../message-item";

interface Props {
  messages: Message[];
}

function MessageList({ messages }: Props) {
  "use no memo";
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    }
  }, [messages, virtualizer]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <Sparkles className="text-primary h-10 w-10" />
        </div>
        <h2 className="text-base-content mb-3 text-2xl font-normal">
          {t("chat.empty_title")}
        </h2>
        <p className="text-base-content/70 max-w-md">{t("chat.empty_desc")}</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="mx-auto max-w-3xl px-4 pb-6">
              <MessageItem message={messages[virtualRow.index]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MessageList;
