"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

type LoginForm = {
  account: string;
  password: string;
};

type Props = {
  onForgotPassword: () => void;
  closeAuth: () => void;
};


const LoginForm: React.FC<Props> = ({ onForgotPassword, closeAuth }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {

      const res = await axiosInstance.post(API_ENDPOINTS.auth.login, {
        account: data.account,
        password: data.password,
      });

      const token = res.data?.token;
      localStorage.setItem("access_token", token);
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
            : "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(message);
    }
  };

  return (
    <div className="auth-form-shell">
      <div className="auth-title text-white text-xl font-semibold">Đăng nhập</div>
      <div className="auth-copy flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400 text-sm my-4 ">
        <span>Nếu bạn chưa có tài khoản,</span>
        <button
          className='auth-link open-register '
          type="button"
        >
          đăng ký ngay
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form pt-3">
        <div className="auth-field relative w-full">
          <input
            type="text"
            id="account"
            {...register("account", {
              required: "Email hoặc tên đăng nhập không được để trống",
            })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Email"
          />
          {errors.account && (
            <p className="text-red-500 text-xs mt-1">
              {errors.account.message}
            </p>
          )}
        </div>

        <div className="auth-field relative w-full mt-3">
          <input
            type="password"
            id="password"
            {...register("password", {
              required: "Mật khẩu không được để trống",
            })}
            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Mật khẩu"
          />

          {errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>



        <button
          type="submit"
          className="auth-submit bg-primary text-black w-full px-4 py-3 mt-7 rounded-lg text-sm font-semibold"
        >
          Đăng nhập
        </button>
        <div>
          <button
            type="button"
            className="text-white text-[13px] my-7 text-center hover:text-primary w-full"
            onClick={onForgotPassword}
          >
            Bạn quên mật khẩu?
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
