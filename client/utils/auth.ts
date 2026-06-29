import axiosInstance, { API_ENDPOINTS } from "./axios";

let userPromise: Promise<any> | null = null;

export const fetchUser = () => {
  if (!userPromise) {
    userPromise = axiosInstance
      .get(API_ENDPOINTS.auth.me)
      .then((res) => res.data)
      .catch(() => null);
  }
  return userPromise;
};
