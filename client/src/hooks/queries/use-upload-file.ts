import { useMutation } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";
import type { BaseResponse } from "@/types";

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await fetchClient.post<BaseResponse>(
        "/file/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data;
    },
  });
}
