// utils/auth.ts
import axiosInstance, { API_ENDPOINTS } from "./axios";

let userPromise: Promise<any> | null = null;

export const fetchUser = () => {
  if (!userPromise) {
    userPromise = axiosInstance
      .get(API_ENDPOINTS.auth.account)
      .then((res) => res.data)
      .catch(() => null);
  }
  return userPromise;
};
