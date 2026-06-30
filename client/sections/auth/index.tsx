import React, { useState, useEffect } from "react";

import LoginForm from "./Login";
import RegisterForm from "./Register";
import ResetPasswordForm from "./ResetPassword";

type Props = {
  isAuth: boolean;
  closeAuth: () => void;
  isActive: number;
};

const Auth: React.FC<Props> = ({ isAuth, closeAuth, isActive }) => {
  const [activeTab, setActiveTab] = useState<number>(isActive);

  useEffect(() => {
    setActiveTab(isActive);
  }, [isActive]);

  const handleTabClick = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  return (
    <>
      {isAuth && (
        <div className="fixed inset-0 flex items-start justify-center z-50 overflow-auto pb-12">
          <div className="auth-backdrop fixed inset-0"></div>
          <div className="auth-panel bg-[#1E2545] modal rounded-xl p-6 sm:p-8 lg:p-14 lg:[padding-left:calc(360px+4rem)] z-10 mx-4 mt-16 w-[calc(100%-2rem)] max-w-[700px] lg:max-w-[800px] lg:before:content-[''] lg:before:absolute lg:before:top-0 lg:before:left-0 lg:before:bottom-0 lg:before:w-[360px] lg:before:bg-[url('/images/rophim-login.jpg')] lg:before:bg-cover lg:before:bg-[position:0_100%] lg:before:rounded-l-xl relative min-w-0">
            <button
              className="auth-close absolute top-0 right-0 text-white [border:none] w-12 h-12 min-h-[40px] p-0 text-base font-medium inline-flex items-center justify-center gap-2 rounded-[0.4rem] opacity-100"
              onClick={closeAuth}
              aria-label="Close auth modal"
            >
              <i className="fa-solid fa-times"></i>
            </button>
            {activeTab === 1 && (
              <LoginForm closeAuth={closeAuth} onForgotPassword={() => handleTabClick(3)} />
            )}

            {activeTab === 2 && <RegisterForm closeAuth={closeAuth} />}


            {activeTab === 3 && <ResetPasswordForm />}



          </div>
        </div>
      )}
    </>
  );
};

export default Auth;
