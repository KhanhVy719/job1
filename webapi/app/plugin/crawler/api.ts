import axios from "axios";
import https from "https"; // 1. Import module https của Node.js
import { TMDB_API_KEYS } from "./config";
import { sleep } from "./utils";

let currentKeyIndex = 0;

export const getApiKey = (): string => {
  const key = TMDB_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % TMDB_API_KEYS.length;
  return key;
};

export const axiosInstance = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({
    // Mặc định xác thực TLS. Chỉ tắt khi ALLOW_INSECURE_TLS=true (upstream cert tự ký).
    rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true"
  })
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      [400, 401, 403, 429].includes(error.response.status) &&
      originalRequest.url?.includes("api.themoviedb.org") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      console.log(`\n!!! Error ${error.response.status}. Switching API Key & Retrying...`);
      const newKey = getApiKey();
      originalRequest.url = originalRequest.url.replace(/api_key=([^&]*)/, `api_key=${newKey}`);
      
      if (error.response.status === 429) {
        await sleep(1000);
      }
      return axiosInstance(originalRequest);
    }
    return Promise.reject(error);
  }
);