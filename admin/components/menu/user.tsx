"use client";

import Link from "next/link";
import { useRouter } from "next/router"; // nếu bạn đang dùng App Router (Next 13+), nên đổi sang: import { usePathname } from "next/navigation";
import React from "react";
import clsx from "clsx";

type MenuUserProps = {
  href: string;
  icon: string;
  label: string;
  isLast?: boolean;
  isFirst?: boolean;
};

const MenuUser: React.FC<MenuUserProps> = ({
  href,
  icon,
  label,
  isFirst,
  isLast,
}) => {
  const { asPath } = useRouter();

  // Bỏ query và hash
  const cleanPath = asPath.split(/[?#]/)[0].replace(/\/+$/, "");
  const normalizedHref = href.replace(/\/+$/, "");

  // Nếu href là "/user/profile" thì gán active cho cả "/user/address"
  const isAddressInProfile =
    normalizedHref === "/user/profile" &&
    cleanPath.startsWith("/user/address");

  const isActive = isAddressInProfile || cleanPath === normalizedHref;

  return (
    <Link
      href={href}
      className={clsx(
        // Base
        "flex py-4 lg:py-5 lg:px-6 px-3 flex items-center space-x-3 font-semibold",
        // Active/inactive
        isActive
          ? "text-black border-b-[6px] border-b-blue-500 lg:border-b-[1px] lg:border-l-[6px] lg:border-b-gray-200 lg:border-l-blue-500"
          : "text-gray-500 hover:text-black border-b-[6px] border-b-white lg:border-b-gray-200 lg:border-b-[1px] lg:border-l-white",
        // Extra
        isLast && "border-b-0",
        isFirst && "rounded-tl-lg",
        isLast && "rounded-bl-lg"
      )}
    >
      <i className={icon} />
      <span className="hidden lg:block text-[15px]">{label}</span>
    </Link>
  );
};

export default MenuUser;
