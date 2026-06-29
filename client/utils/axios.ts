import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import https from "https";

const isServer = typeof window === "undefined";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,

  ...(isServer && {
    httpsAgent: new https.Agent({
      // Mặc định bật kiểm tra TLS. Chỉ tắt khi ALLOW_INSECURE_TLS=true (dev/nội bộ).
      rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
    }),
  }),
});

// --- TYPE DECLARATION ---
declare module "axios" {
  export interface AxiosInstance {
    resolveURL: (path: string) => string;
  }
}

// --- HELPER: Resolve URL ---
axiosInstance.resolveURL = (path: string) => {
  const base = axiosInstance.defaults.baseURL || "";
  try {
    return new URL(path, base).toString();
  } catch (e) {
    return path;
  }
};

// --- HELPER: Lấy giá trị Cookie theo tên (Client-side) ---
const getCookie = (name: string): string | undefined => {
  if (isServer) return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

// --- REQUEST INTERCEPTOR ---
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Chỉ chạy logic này ở Client
    if (!isServer) {
      // 1. Bearer Token (cho xác thực API thông thường)
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. XSRF Token (Bắt buộc phải lấy từ Cookie và nhét vào Header thủ công)
      // Browser tự gửi Cookie 'XSRF-TOKEN', nhưng Server cần đối chiếu với Header 'X-XSRF-TOKEN'
      const xsrfToken = getCookie("XSRF-TOKEN");
      
      if (xsrfToken) {
        config.headers["X-XSRF-TOKEN"] = xsrfToken;
        // Hỗ trợ thêm header thường gặp khác nếu backend yêu cầu
        config.headers["X-CSRF-TOKEN"] = xsrfToken; 
      }
      
      // LƯU Ý QUAN TRỌNG:
      // Không cần và không thể làm: config.headers['Cookie'] = document.cookie;
      // Trình duyệt chặn hành động này vì lý do bảo mật.
      // 'withCredentials: true' ở trên đã đảm nhiệm việc gửi toàn bộ cookie rồi.
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR ---
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response, // Trả về data trực tiếp hoặc response tùy convention
  (error: AxiosError) => {
    // Xử lý lỗi tập trung
    const customError = (error.response?.data as any) || {
      message: error.message || "Something went wrong",
    };
    return Promise.reject(customError);
  }
);

export default axiosInstance;

export const API_ENDPOINTS = {
  home: "/api/v1/home",
  search: "/api/v1/duyet-tim",
  menu: {
    categories: "/api/v1/menu/the-loai",
    countries: "/api/v1/menu/quoc-gia",
  },

  schedule: "/api/v1/lich-chieu",

  movie: {
    detail: (slug: string) => `/api/v1/phim/${slug}`,
    watch: (slug: string, episode_slug: string) =>
      `/api/v1/watch/${slug}/${episode_slug}`,
    filterByCategory: (slug: string) => `/api/v1/the-loai/${slug}`,
    filterByCountry: (slug: string) => `/api/v1/quoc-gia/${slug}`,
    filterByProposal: (slug: string) => `/api/v1/phim/${slug}/de-xuat`,
    Season: (slug: string) => `/api/v1/phim/${slug}/phan`,

  },
  actor: {
    list: "/api/v1/dien-vien",
    detail: (slug: string) => `/api/v1/dien-vien/${slug}`,
    movies: (slug: string) => `/api/v1/dien-vien/${slug}/phim`,
  },

  studio: {
    list: "/nha-san-xuat",
    detail: (slug: string) => `/api/v1/nha-san-xuat/${slug}`,
    movies: (slug: string) => `/api/v1/nha-san-xuat/${slug}/phim`,
  },

  auth: {
    me: "/api/v1/auth/me",
    login: "/api/v1/auth/login",
    register: "/api/v1/auth/register",
  },
};
