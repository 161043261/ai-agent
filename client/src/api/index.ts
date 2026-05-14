/**
 * @deprecated Use hooks from `@/hooks/queries` with @tanstack/react-query instead.
 * This module is kept for backward compatibility only.
 */
import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 0, // No timeout
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => {
    return Promise.reject(err);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
