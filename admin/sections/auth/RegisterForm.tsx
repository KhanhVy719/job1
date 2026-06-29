"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
type RegisterForm = {
  fullname: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  rePassword: string;
  referral: string;
};
type Props = {
  closeAuth: () => void;
};

const RegisterForm: React.FC<Props> = ({ closeAuth }) => {
  const router = useRouter();

  const { register, handleSubmit } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await axiosInstance.post(API_ENDPOINTS.auth.register, {
        fullname: data.fullname,
        email: data.email,
        phone: data.phone,
        username: data.username,
        referral: data.referral,
        password: data.password,
        rePassword: data.rePassword,
      });

      const token = res.data?.token;
      localStorage.setItem("access_token", token);
          router.replace({
        pathname: router.pathname,
      });
      toast.success(res.data.message);
      closeAuth();
    } catch (error: any) {
      const message =
        typeof error === "object" && error?.message
          ? error.message
          : typeof error === "string"
          ? error
          : "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(message);
    }
  };

  return (
    <div>
      <div className="text-white text-lg font-medium">Tạo tài khoản mới</div>
      <div className="flex items-center space-x-2 text-gray-400 text-sm my-4 ">
        <span>Nếu bạn đã có tài khoản,</span>
        <button
          className='text-primary open-login '
        >
          đăng nhập
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="relative w-full">
          <input
            type="text"
            id="fullName"
            required
            {...register("fullname", {
              required: "Họ tên không được để trống",
            })}
            className="  text-white w-full border  border-gray-700 rounded-md  px-4 py-3 text-sm  focus:outline-none focus:border-white bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Tên hiển thị"
          />
         
        </div>

        {/* Email */}
        <div className="relative w-full mt-3">
          <input
            type="email"
            id="email"
            required
            {...register("email", { required: "Email không được để trống" })}
            className="  text-white w-full border  border-gray-700 rounded-md  px-4 py-3 text-sm  focus:outline-none focus:border-white bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Email"
          />
        </div>

     
        <div className="relative w-full mt-3">
          <input
            type="password"
            id="password"
            required
            {...register("password", {
              required: "Mật khẩu không được để trống",
            })}
            className="  text-white w-full border  border-gray-700 rounded-md  px-4 py-3 text-sm  focus:outline-none focus:border-white bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Mật khẩu"
          />
         
        </div>

        {/* Nhập lại mật khẩu */}
        <div className="relative w-full mt-3">
          <input
            type="password"
            id="rePassword"
            required
            {...register("rePassword", {
              required: "Mật khẩu xác nhận không được để trống",
            })}
            className="  text-white w-full border  border-gray-700 rounded-md  px-4 py-3 text-sm  focus:outline-none focus:border-white bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Nhập lại mật khẩu"
          />
      
        </div>

        <button
          type="submit"
          className="bg-primary text-black w-full px-4 py-3 mt-7 rounded-lg text-sm font-semibold"
        >
          Đăng ký
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
