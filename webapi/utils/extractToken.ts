import jwt from "jsonwebtoken";

export const extractToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) return null;

  const parts = authorizationHeader.split(" ");
  
  if (parts.length === 2 && parts[0] === "Bearer") {
    return verifyToken(parts[1]); 
  }
  
  return null;
};

function verifyToken(token?: string) {
  if (!token) throw new Error("Không có token");
  try {
    return (jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any).userId;
  } catch {
    throw new Error("Token không hợp lệ hoặc hết hạn");
  }
}
