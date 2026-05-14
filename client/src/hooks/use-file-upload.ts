import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUploadFile } from "@/hooks/queries";
import { toast } from "sonner";

function useFileUpload() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadFile();

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".md") && !filename.endsWith(".txt")) {
      toast.error(t("chat.file_type_error"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: ({ code, message }) => {
        if (code === 1000) {
          toast.success(t("chat.upload_success"));
        } else {
          toast.error(message || t("chat.upload_failed"));
        }
      },
      onError: (err) => {
        if (import.meta.env.DEV) console.error(err);
        toast.error(t("chat.upload_failed"));
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  return {
    uploading: uploadMutation.isPending,
    fileInputRef,
    triggerFileUpload,
    handleFileUpload,
  };
}

export default useFileUpload;
