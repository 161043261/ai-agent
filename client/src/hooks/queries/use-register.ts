import { useMutation } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";

interface RegisterParams {
  email: string;
  password: string;
}

interface RegisterResponse {
  code: number;
  message?: string;
  token?: string;
  username?: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      const { data } = await fetchClient.post<RegisterResponse>(
        "/user/register",
        params,
      );
      return data;
    },
  });
}
