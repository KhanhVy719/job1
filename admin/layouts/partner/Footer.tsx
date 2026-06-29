import React from "react";
import Image from "next/image";
import momo from "@/assets/svg/bank/momo.svg";
import vnpay from "@/assets/svg/bank/vnpay.svg";
import visa from "@/assets/svg/bank/visa.svg";
import mastercard from "@/assets/svg/bank/mastercard.svg";

const Footer: React.FC = () => {
  const Bank = [
    { src: momo, alt: "momo" },
    { src: vnpay, alt: "vnpay" },
    { src: visa, alt: "visa" },
    { src: mastercard, alt: "mastercard" },
  ];
  return (
    <>
      <footer className="bg-[#f3f7fe]  lg:flex-row flex-col py-4 w-full px-3 sm:px-6 md:px-10 lg:px-15 xl:px-40 flex items-center justify-between">
        <div className="font-semibold text-sm lg:mb-0 mb-5">
          © Thiết kế và giữ bản quyền bởi Divine Shop.
        </div>

        <div className="flex flex-row items-center space-x-4">
          <div className="flex flex-row items-center space-x-4">
            {Bank.map((img, i) => (
              <Image
                key={i}
                src={img.src}
                alt={img.alt}
                width={30}
                height={30}
                className="lg:w-[35px] w-[30px]"
                  style={{ height: "auto" }}
              />
            ))}
          </div>
          <div className="lg:text-sm text-xs font-semibold ">và nhiều hình thức thanh toán khác</div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
