import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { Session } from "@/types";

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
  onCreateNewSession: () => void;
  onSwitch: (sessionId: string) => void;
}

function SessionSidebar({
  sessions,
  currentSessionId,
  onCreateNewSession,
  onSwitch,
}: Props) {
  const { t } = useTranslation();

  return (
    <aside className="border-base-200 bg-base-100 flex w-72 flex-col border-r">
      <div className="border-base-200 border-b p-4">
        <button
          onClick={onCreateNewSession}
          className="btn border-base-200 bg-base-100 text-base-content hover:bg-base-200 h-10 min-h-10 w-full gap-2 rounded-full border shadow-sm"
        >
          <Plus className="text-primary h-5 w-5" />
          {t("chat.new_chat")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSwitch(session.id)}
              className={`mb-1 w-full rounded-full px-4 py-3 text-left text-sm transition-colors ${
                currentSessionId === session.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-base-content hover:bg-base-200"
              }`}
            >
              {session.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default SessionSidebar;
