import SettingsBar from "@/components/settings-bar";
import { MODELS, type ModelType } from "@/types";
import { ArrowLeft, Paperclip, RefreshCw } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface Props {
  currentSessionId: string | null;
  tempSession: boolean;
  selectedModel: string;
  isStreaming: boolean;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSyncHistory: () => void;
  onModelChange: (value: ModelType) => void;
  onStreamingChange: (value: boolean) => void;
  onTriggerUpload: () => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}

function ChatHeader({
  currentSessionId,
  tempSession,
  selectedModel,
  isStreaming,
  uploading,
  fileInputRef,
  onSyncHistory,
  onModelChange,
  onStreamingChange,
  onTriggerUpload,
  onFileUpload,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="border-base-200 bg-base-100 flex items-center gap-4 border-b px-6 py-3">
      <button
        onClick={() => navigate("/menu")}
        className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200 gap-2 rounded-full"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>

      <div className="bg-base-300 h-6 w-px" />

      <button
        onClick={onSyncHistory}
        disabled={
          currentSessionId === null ||
          currentSessionId.length === 0 ||
          tempSession
        }
        className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200 gap-2 rounded-full disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" />
        {t("chat.sync_history")}
      </button>

      <div className="ml-4 flex items-center gap-2">
        <span className="text-base-content/70 text-sm">{t("chat.model")}:</span>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as ModelType)}
          className="select select-bordered select-sm border-base-300 focus:ring-primary h-9 w-40 rounded-md text-sm focus:ring-1 focus:outline-none"
        >
          <option value={MODELS.OLLAMA_MODEL}>Ollama</option>
          <option value={MODELS.OLLAMA_RAG_MODEL}>Ollama with RAG</option>
        </select>
      </div>

      <div className="ml-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="streaming"
          checked={isStreaming}
          onChange={(e) => onStreamingChange(e.target.checked)}
          className="checkbox checkbox-sm checkbox-primary border-base-300"
        />
        <label
          htmlFor="streaming"
          className="text-base-content/70 cursor-pointer text-sm"
        >
          {t("chat.streaming")}
        </label>
      </div>

      <button
        onClick={onTriggerUpload}
        disabled={uploading}
        className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200 ml-auto gap-2 rounded-full disabled:opacity-50"
      >
        <Paperclip className="h-4 w-4" />
        {t("chat.upload_doc")}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        className="hidden"
        onChange={onFileUpload}
      />

      <div className="bg-base-300 h-6 w-px" />
      <SettingsBar />
    </header>
  );
}

export default ChatHeader;
