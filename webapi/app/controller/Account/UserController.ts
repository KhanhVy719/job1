import { Request, Response } from "express";
import User from "../../model/User";
import Playlist from "../../model/Playlist";
import Movie from "../../model/Movie";
import bcrypt from "bcryptjs"; // Cần cài: npm install bcryptjs
import jwt from "jsonwebtoken"; // Cần cài: npm install jsonwebtoken

// Bắt buộc đọc từ ENV. Không có fallback hardcode (lộ secret = giả mạo được mọi token).
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error("FATAL: ACCESS_TOKEN_SECRET chưa được cấu hình trong .env");
}

class UserController {
  
  static register = async (req: Request, res: Response) => {
    try {
      // Lấy thêm confirm_password từ body
      const { fullname, email, password, confirm_password } = req.body;

      // 1. Validate Tên hiển thị
      if (!fullname || fullname.trim().length === 0) {
        return res.json({ status: false, message: "Vui lòng nhập tên hiển thị" });
      }
      if (fullname.length < 2) {
        return res.json({ status: false, message: "Tên hiển thị phải có ít nhất 2 ký tự" });
      }

      // 2. Validate Email
      if (!email || email.trim().length === 0) {
        return res.json({ status: false, message: "Vui lòng nhập địa chỉ Email" });
      }
      // Regex kiểm tra định dạng email cơ bản
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.json({ status: false, message: "Địa chỉ Email không hợp lệ" });
      }

      // 3. Validate Mật khẩu
      if (!password || password.length === 0) {
        return res.json({ status: false, message: "Vui lòng nhập mật khẩu" });
      }
      if (password.length < 6) {
        return res.json({ status: false, message: "Mật khẩu phải có ít nhất 6 ký tự" });
      }

      // 4. Validate Nhập lại mật khẩu
      if (!confirm_password || confirm_password.length === 0) {
        return res.json({ status: false, message: "Vui lòng nhập lại mật khẩu" });
      }
      if (password !== confirm_password) {
        return res.json({ status: false, message: "Mật khẩu nhập lại không khớp" });
      }

      // 5. Kiểm tra Email đã tồn tại trong DB chưa
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.json({ status: false, message: "Email này đã được sử dụng bởi tài khoản khác" });
      }

      // 6. Mã hóa mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 7. Tạo user mới
      const newUser = await User.create({
        fullname,
        email,
        password: hashedPassword,
        // Tạo avatar mặc định đẹp hơn với ui-avatars
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=random&color=fff&size=128`,
      });

      // Trả về kết quả thành công
      res.json({ 
        status: true, 
        message: "Đăng ký tài khoản thành công!", 
        data: { 
          email: newUser.email, 
          fullname: newUser.fullname 
        } 
      });

    } catch (e: any) {
      console.error(e);
      res.json({ status: false, message: "Lỗi hệ thống khi đăng ký tài khoản" });
    }
  };

  // Đăng nhập
  static login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input đầu vào
      if (!email || !password) {
        return res.json({ status: false, message: "Vui lòng nhập Email và Mật khẩu" });
      }

      // 1. Kiểm tra User tồn tại
      const user = await User.findOne({ email });
      if (!user) {
        return res.json({ status: false, message: "Email chưa được đăng ký" });
      }

      // 2. Kiểm tra mật khẩu
      const isMatch = await bcrypt.compare(password, user.password || "");
      if (!isMatch) {
        return res.json({ status: false, message: "Mật khẩu không chính xác" });
      }

      const token = jwt.sign(
        { userId: user._id, role: "user" }, 
        ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" } // Thời hạn 7 ngày
      );

      const userData = user.toObject();
      delete (userData as any).password;

      res.json({
        status: true,
        message: "Đăng nhập thành công",
        token,
        data: userData
      });

    } catch (e) {
      console.error(e);
      res.json({ status: false, message: "Lỗi hệ thống khi đăng nhập" });
    }
  };


  // Lấy thông tin user (kèm populate lịch sử và yêu thích)
  static getProfile = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params; // Giả sử ID user truyền qua params hoặc middleware auth
      const user = await User.findById(userId)
        .select("-password") // Không trả về password
        .populate("favorites", "name slug thumb_url")
        .populate("history.movie", "name slug thumb_url episode_current")
        .lean();

      if (!user) return res.json({ status: false, message: "User không tồn tại" });

      // Lấy thêm danh sách playlist của user này
      const playlists = await Playlist.find({ user: userId }).lean();

      res.json({ status: true, data: { ...user, playlists } });
    } catch (e) {
      res.json({ status: false, message: "Lỗi lấy thông tin user" });
    }
  };

  // Tạo User mới (Demo - Deprecated, nên dùng register)
  static createUser = async (req: Request, res: Response) => {
    try {
      const { fullname, email, gender, avatar } = req.body;
      const newUser = await User.create({ fullname, email, gender, avatar });
      res.json({ status: true, data: newUser });
    } catch (e: any) {
      res.json({ status: false, message: e.message || "Lỗi tạo user" });
    }
  };

  // --- FAVORITES (Yêu thích) ---

  // Toggle yêu thích (Có rồi thì xóa, chưa có thì thêm)
  static toggleFavorite = async (req: Request, res: Response) => {
    try {
      const { userId, movieId } = req.body;
      
      // 1. Kiểm tra Movie có tồn tại không
      const movieExists = await Movie.findById(movieId).select("_id");
      if (!movieExists) {
        return res.json({ status: false, message: "Phim không tồn tại" });
      }

      const user = await User.findById(userId);
      if (!user) return res.json({ status: false, message: "User không tồn tại" });

      const isExist = user.favorites.includes(movieId);
      if (isExist) {
        // Xóa khỏi favorites
        await User.findByIdAndUpdate(userId, { $pull: { favorites: movieId } });
        res.json({ status: true, message: "Đã xóa khỏi yêu thích" });
      } else {
        // Thêm vào favorites
        await User.findByIdAndUpdate(userId, { $addToSet: { favorites: movieId } });
        res.json({ status: true, message: "Đã thêm vào yêu thích" });
      }
    } catch (e) {
      res.json({ status: false, message: "Lỗi cập nhật yêu thích" });
    }
  };

  // --- WATCH HISTORY (Lịch sử) ---

  // Thêm vào lịch sử xem
  static addToHistory = async (req: Request, res: Response) => {
    try {
      const { userId, movieId } = req.body;

      // 1. Kiểm tra Movie có tồn tại không
      const movieExists = await Movie.findById(movieId).select("_id");
      if (!movieExists) {
        return res.json({ status: false, message: "Phim không tồn tại" });
      }

      // Logic: Xóa phim cũ trong history (nếu có) để đưa lên đầu danh sách
      await User.findByIdAndUpdate(userId, {
        $pull: { history: { movie: movieId } }
      });

      // Push mới vào đầu mảng history
      await User.findByIdAndUpdate(userId, {
        $push: { 
          history: { 
            $each: [{ movie: movieId, watchedAt: new Date() }],
            $position: 0 // Đưa lên đầu
          } 
        }
      });

      res.json({ status: true, message: "Đã lưu lịch sử xem" });
    } catch (e) {
      res.json({ status: false, message: "Lỗi lưu lịch sử" });
    }
  };

  // --- PLAYLIST ---

  // Tạo Playlist mới
  static createPlaylist = async (req: Request, res: Response) => {
    try {
      const { userId, name } = req.body;
      const newPlaylist = await Playlist.create({ user: userId, name, movies: [] });
      res.json({ status: true, data: newPlaylist });
    } catch (e) {
      res.json({ status: false, message: "Lỗi tạo playlist" });
    }
  };

  // Thêm phim vào Playlist
  static addMovieToPlaylist = async (req: Request, res: Response) => {
    try {
      const { playlistId, movieId } = req.body;

      // 1. Kiểm tra Movie có tồn tại không
      const movieExists = await Movie.findById(movieId).select("_id");
      if (!movieExists) {
        return res.json({ status: false, message: "Phim không tồn tại" });
      }

      // Dùng addToSet để tránh trùng lặp phim trong 1 playlist
      const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { movies: movieId } },
        { new: true }
      );
      res.json({ status: true, data: playlist, message: "Đã thêm phim vào playlist" });
    } catch (e) {
      res.json({ status: false, message: "Lỗi cập nhật playlist" });
    }
  };

  // Xóa phim khỏi Playlist
  static removeMovieFromPlaylist = async (req: Request, res: Response) => {
    try {
      const { playlistId, movieId } = req.body;
      
      const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { movies: movieId } },
        { new: true }
      );
      res.json({ status: true, data: playlist, message: "Đã xóa phim khỏi playlist" });
    } catch (e) {
      res.json({ status: false, message: "Lỗi cập nhật playlist" });
    }
  };
  
  // Lấy chi tiết 1 Playlist
  static getPlaylistDetail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const playlist = await Playlist.findById(id).populate("movies", "name slug thumb_url episode_current").lean();
      if (!playlist) return res.json({ status: false, message: "Playlist không tồn tại" });
      res.json({ status: true, data: playlist });
    } catch (e) {
       res.json({ status: false, message: "Lỗi lấy playlist" });
    }
  }
}

export default UserController;