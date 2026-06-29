import React from "react";



const ResetPasswordForm: React.FC = () => {
  return (
    <div>
      <div className="text-white text-lg font-medium">Quên mật khẩu</div>
      <div className="flex items-center space-x-2 text-gray-400 text-sm my-4 ">
        <span>Nếu bạn đã có tài khoản,</span>
        <button
          className='text-primary open-register '
        >
          đăng nhập
        </button>
      </div>
      <form className="pt-3">
        <div className="relative w-full">
          <input
            type="text"
            id="account"

            className="  text-white w-full border  border-gray-700 rounded-md  px-4 py-3 text-sm  focus:outline-none focus:border-white bg-[#1E2545] placeholder:text-gray-500"
            placeholder="Email đăng ký"
          />

        </div>




        <button
          type="submit"
          className="bg-primary text-black w-full px-4 py-3 mt-7 rounded-lg text-sm font-semibold"
        >
          Gửi yêu cầu
        </button>

      </form>
    </div>
  );
};

export default ResetPasswordForm;
