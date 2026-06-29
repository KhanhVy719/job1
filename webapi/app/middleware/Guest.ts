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
      throw new Error("Bạn chưa đăng nhập tài khoản");
    }

    const check :any= extractToken(authHeader) ;
    if (!check) {
      throw new Error("Bạn chưa đăng nhập tài khoản");
    }

    const user = await User.findOne({ _id: check  });

    if (!user) {
      throw new Error("Bạn chưa đăng nhập tài khoản");
    }

    req.user = user;
    next();

  } catch (error: any) {
    return res.status(401).json({
      message: error.message || "Bạn chưa đăng nhập tài khoản",
    });
  }
};