import { useMutation } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";

interface LoginParams {
  username: string;
  password: string;
}

interface LoginResponse {
  code: number;
  message?: string;
  token?: string;
  username?: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (params: LoginParams) => {
      const { data } = await fetchClient.post<LoginResponse>(
        "/user/login",
        params,
      );
      return data;
    },
  });
}
