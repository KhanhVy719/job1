import fs from "fs";
import limax from 'limax';

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateSlug = (str: string): string => {
  if (!str) return "";
  // limax mặc định chuyển đổi sang dạng slug, hỗ trợ đa ngôn ngữ
  return limax(str, {
    tone: false, // bỏ dấu (cho tiếng Việt)
    separator: '-',
    lang: 'vi', // ngôn ngữ, nhưng limax tự động phát hiện
  });
};
export const loadState = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {}
  // Mặc định trả về
  if (filePath.includes("tap")) return { last_id: null };
  return { page: 1 };
};

export const saveState = (filePath: string, data: any) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};