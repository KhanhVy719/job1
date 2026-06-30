import axios, { AxiosResponse, AxiosError } from "axios";
import https from "https";

const isServer = typeof window === "undefined";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  withCredentials: true,
  ...(isServer && {
    httpsAgent: new https.Agent({
      // Mặc định bật kiểm tra TLS. Chỉ tắt khi ALLOW_INSECURE_TLS=true (dev/nội bộ).
      rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
    }),
  }),
});

declare module "axios" {
  export interface AxiosInstance {
    resolveURL: (path: string) => string;
  }
}

axiosInstance.resolveURL = (path: string) => {
  const base = axiosInstance.defaults.baseURL || "";
  return new URL(path, base).toString();
};

axiosInstance.interceptors.request.use((config) => {
  if (!isServer) {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) =>
    Promise.reject(
      (error.response && error.response.data) || "Something went wrong"
    )
);

export default axiosInstance;

export const API_ENDPOINTS = {
  movie: {
    upload:"/api/v1/movie/upload",
    list: "/api/v1/movie/list",
    tmdb: (tmdb: string) => `/api/v1/movie/${tmdb}/get`,
  },
  upload: "/api/v1/upload",
  uploadJobs: "/api/v1/upload/jobs",
  cancelUploadJob: (jobId: string) => `/api/v1/upload/jobs/${jobId}/cancel`,
  category: {
    get: "/api/v1/category/list",
  },
  country: {
    get: "/api/v1/country/list",
  },
};
