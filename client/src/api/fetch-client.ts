import axios from "axios";

const fetchClient = axios.create({
  baseURL: "/api",
  timeout: 0,
});

fetchClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err),
);

fetchClient.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default fetchClient;
