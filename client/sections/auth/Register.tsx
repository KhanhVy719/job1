"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { useAuthContext } from "@/context/AuthContext";
type Register = {
  fullname: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  confirm_password: string;
  referral: string;
};
type Props = {
  closeAuth: () => void;
};

const Register: React.FC<Props> = ({ closeAuth }) => {
  const router = useRouter();
  const { refreshAuth } = useAuthContext();

  const { register, handleSubmit } = useForm<Register>();

  const onSubmit = async (data: Register) => {
    try {
      const res = await axiosInstance.post(API_ENDPOINTS.auth.register, {
        fullname: data.fullname,
        email: data.email,
        phone: data.phone,
        username: data.username,
        referral: data.referral,
        password: data.password,
        confirm_password: data.confirm_password,
      });

      const token = res.data?.token;
      localStorage.setItem("access_token", token);
      await refreshAuth();
      toast.success(res.data.message);
      router.replace({
        pathname: router.pathname,
        query: router.query, // <--- Thêm dòng này
      });
      closeAuth();
    } catch (error: any) {
      const message =
        typeof error === "object" && error?.message
          ? error.message
          : typeof error === "string"
            ? error
            : "Đăng ký tài khoản thất bại";
      toast.error(message);
    }
  };

  return (
    <div className="auth-form-shell">
      <div className="auth-title text-white text-xl font-semibold">Tạo tài khoản mới</div>
      <div className="auth-copy flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400 text-sm my-4 ">
        <span>Nếu bạn đã có tài khoản,</span>
        <button
          className='auth-link open-login '
          type="button"
        >
          đăng nhập
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <div className="auth-field relative w-full">
          <input
            type="text"
            id="fullName"
            required
            {...register("fullname", {
              required: "Họ tên không được để trống",
            })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Tên hiển thị"
          />

        </div>

        <div className="auth-field relative w-full mt-3">
          <input
            type="email"
            id="email"
            required
            {...register("email", { required: "Email không được để trống" })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Email"
          />
        </div>


        <div className="auth-field relative w-full mt-3">
          <input
            type="password"
            id="password"
            required
            {...register("password", {
              required: "Mật khẩu không được để trống",
            })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Mật khẩu"
          />

        </div>

        {/* Nhập lại mật khẩu */}
        <div className="auth-field relative w-full mt-3">
          <input
            type="password"
            id="confirm_password"
            required
            {...register("confirm_password", {
              required: "Mật khẩu xác nhận không được để trống",
            })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Nhập lại mật khẩu"
          />

        </div>

        <button
          type="submit"
          className="auth-submit bg-primary text-black w-full px-4 py-3 mt-7 rounded-lg text-sm font-semibold"
        >
          Đăng ký
        </button>
      </form>
    </div>
  );
};

export default Register;
