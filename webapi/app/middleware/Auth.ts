import { Request, Response, NextFunction } from "express";
import User from "../model/User";
import jwt, { JwtPayload } from "jsonwebtoken";
import { extractToken } from "../../utils/extractToken";

interface DecodedToken extends JwtPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  user?: any; 
}

export default async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const rawToken = extractToken(authHeader);

    if (rawToken) {
      if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("FATAL: ACCESS_TOKEN_SECRET chưa được cấu hình trong .env");
      }
      const decoded = jwt.verify(
        rawToken,
        process.env.ACCESS_TOKEN_SECRET
      ) as DecodedToken;

      const user = await User.findOne({ _id: decoded.userId });

      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch {
    next();
  }
};