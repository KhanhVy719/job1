import React from "react";



const ResetPasswordForm: React.FC = () => {
  return (
    <div className="auth-form-shell">
      <div className="auth-title text-white text-xl font-semibold">Quên mật khẩu</div>
      <div className="auth-copy flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400 text-sm my-4 ">
        <span>Nếu bạn đã có tài khoản,</span>
        <button
          className='auth-link open-login '
          type="button"
        >
          đăng nhập
        </button>
      </div>
      <form className="auth-form pt-3">
        <div className="auth-field relative w-full">
          <input
            type="text"
            id="account"

            className="auth-input text-white w-full border border-gray-700 rounded-md px-4 py-3 text-sm focus:outline-none bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Email đăng ký"
          />

        </div>




        <button
          type="submit"
          className="auth-submit bg-primary text-black w-full px-4 py-3 mt-7 rounded-lg text-sm font-semibold"
        >
          Gửi yêu cầu
        </button>

      </form>
    </div>
  );
};

export default ResetPasswordForm;
