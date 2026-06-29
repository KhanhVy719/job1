import { Request, Response } from "express";
import User, { IUser } from "../../model/User"; // Import cả Interface IUser
import Playlist from "../../model/Playlist";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Bắt buộc đọc từ ENV. Không có fallback hardcode (lộ secret = giả mạo được mọi JWT).
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error("FATAL: ACCESS_TOKEN_SECRET chưa được cấu hình trong .env");
}

class AuthController {
  static Register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullname, email, password, confirm_password } = req.body;

      if (!fullname || fullname.trim().length === 0)
        throw new Error("Vui lòng nhập tên hiển thị");
      if (fullname.length < 2)
        throw new Error("Tên hiển thị phải có ít nhất 2 ký tự");

      if (!email || email.trim().length === 0)
        throw new Error("Vui lòng nhập địa chỉ Email");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))
        throw new Error("Địa chỉ Email không hợp lệ");

      if (!password || password.length === 0)
        throw new Error("Vui lòng nhập mật khẩu");
      if (password.length < 6)
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");

      if (!confirm_password || confirm_password.length === 0)
        throw new Error("Vui lòng nhập lại mật khẩu");
      if (password !== confirm_password)
        throw new Error("Mật khẩu nhập lại không khớp");

      const existingUser = await User.findOne({ email });
      if (existingUser)
        throw new Error("Email này đã được sử dụng bởi tài khoản khác");

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        fullname,
        email,
        password: hashedPassword,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          fullname
        )}&background=random&color=fff&size=128`,
        verify: true,
      });

      const token = jwt.sign(
        { userId: newUser._id, role: "user" },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Đăng ký tài khoản thành công!",
        token: token,
      });
    } catch (error: unknown) {
      let errorMessage = "Lỗi hệ thống khi đăng ký tài khoản";
      if (error instanceof Error) errorMessage = error.message;
      res.status(400).json({ status: false, message: errorMessage });
    }
  };

  static Login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { account, password } = req.body as {
        account?: string;
        password?: string;
      };

      if (!account || !password)
        throw new Error("Vui lòng nhập Email và Mật khẩu");

      const user = await User.findOne({ email: account }).lean();

      if (!user) throw new Error("Email chưa được đăng ký");

      if (!user.password)
        throw new Error("Tài khoản lỗi: Không tìm thấy mật khẩu");

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error("Sai mật khẩu");

      const token = jwt.sign(
        { userId: user._id, role: "user" },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Đăng nhập thành công",
        token,
      });
      
    } catch (error: unknown) {
      let errorMessage = "Lỗi hệ thống khi đăng nhập";
      if (error instanceof Error) errorMessage = error.message;
      res.status(400).json({ status: false, message: errorMessage });
    }
  };

  static getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = (req as any).user;

      if (!currentUser) throw new Error("Thiếu thông tin xác thực");

      const userId = currentUser._id; 

      const user = await User.findById(userId)
        .select("-password")
        .populate("favorites", "name slug thumb_url")
        .populate("history.movie", "name slug thumb_url episode_current")
        .lean();

      if (!user) throw new Error("User không tồn tại");

      const playlists = await Playlist.find({ user: userId }).lean();

      res.json({ 
        data: { ...user, playlists } 
      });

    } catch (error: unknown) {
      let errorMessage = "Lỗi lấy thông tin user";
      if (error instanceof Error) errorMessage = error.message;
      
      res.status(400).json({ 
        message: errorMessage 
      });
    }
  };

}

export default AuthController;
