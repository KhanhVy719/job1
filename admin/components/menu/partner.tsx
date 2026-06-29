import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

type MenuUserProps = {
  href: string;
  icon: string;
  label: string;
};

const Partner: React.FC<MenuUserProps> = ({ href, icon, label }) => {
  const pathname = usePathname() || "";

  const normalize = (path: string) => path.replace(/\/+$/, "");
  const cleanPath = normalize(pathname);
  const baseHref = normalize(href);

  if (baseHref === "/partner/products") {
    const parts = cleanPath.split("/").filter(Boolean);

    const isProductsActive =
      cleanPath === baseHref ||
      (parts.length >= 3 &&
        parts[0] === "partner" &&
        parts[1] === "products" &&
        !["add", "edit"].includes(parts[2]));

    return (
      <li>
        <Link
          href={href}
          className={clsx(
            "px-5 py-2.5 text-sm space-x-2 w-full flex items-center rounded-lg",
            isProductsActive
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <i className={icon}></i>
          <span>{label}</span>
        </Link>
      </li>
    );
  }

  // ✅ Fix cho /partner/settings (chỉ exact)
  if (baseHref === "/partner/settings") {
    const isSettingsActive = cleanPath === baseHref;
    return (
      <li>
        <Link
          href={href}
          className={clsx(
            "px-5 py-2.5 text-sm space-x-2 w-full flex items-center rounded-lg",
            isSettingsActive
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <i className={icon}></i>
          <span>{label}</span>
        </Link>
      </li>
    );
  }

  // ✅ Fix cho /partner/vouchers (loại trừ add)
  if (baseHref === "/partner/vouchers") {
    const parts = cleanPath.split("/").filter(Boolean);

    const isVouchersActive =
      cleanPath === baseHref ||
      (parts.length >= 3 &&
        parts[0] === "partner" &&
        parts[1] === "vouchers" &&
        parts[2] !== "add");

    return (
      <li>
        <Link
          href={href}
          className={clsx(
            "px-5 py-2.5 text-sm space-x-2 w-full flex items-center rounded-lg",
            isVouchersActive
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <i className={icon}></i>
          <span>{label}</span>
        </Link>
      </li>
    );
  }

  if (baseHref === "/partner/ads") {
    const parts = cleanPath.split("/").filter(Boolean);

    const isVouchersActive =
      cleanPath === baseHref ||
      (parts.length >= 3 &&
        parts[0] === "partner" &&
        parts[1] === "ads" &&
        parts[2] !== "create");

    return (
      <li>
        <Link
          href={href}
          className={clsx(
            "px-5 py-2.5 text-sm space-x-2 w-full flex items-center rounded-lg",
            isVouchersActive
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <i className={icon}></i>
          <span>{label}</span>
        </Link>
      </li>
    );
  }
  // ✅ Các menu khác: mặc định
  const segmentCount = baseHref.split("/").filter(Boolean).length;
  const isActive =
    cleanPath === baseHref ||
    (segmentCount > 1 && cleanPath.startsWith(baseHref + "/"));

  return (
    <li>
      <Link
        href={href}
        className={clsx(
          "px-5 py-2.5 text-sm space-x-2 w-full flex items-center rounded-lg",
          isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
        )}
      >
        <i className={icon}></i>
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Partner;
