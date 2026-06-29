"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";

export type MenuItemProps = {
  href?: string;
  icon?: string;
  label: string;
  children?: MenuItemProps[];
  depth?: number;
};

const normalize = (p: string) =>
  (p || "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";

const getPaddingClass = (depth = 0) => {
  if (!depth || depth <= 0) return "px-3";
  const map: Record<number, string> = {
    1: "pl-4 pr-3",
    2: "pl-8 pr-3",
    3: "pl-12 pr-3",
    4: "pl-16 pr-3",
    5: "pl-20 pr-3",
  };
  return map[Math.min(depth, 5)];
};

const Admin: React.FC<MenuItemProps> = ({
  href,
  icon,
  label,
  children,
  depth = 0,
}) => {
  const pathname = usePathname();
  const cleanPath = normalize(pathname ?? "/");
  const normalizedHref = href ? normalize(href) : "";
  const segCount = normalizedHref.split("/").filter(Boolean).length;

  const isActive =
    !!href &&
    (cleanPath === normalizedHref ||
      (segCount > 1 && cleanPath.startsWith(normalizedHref + "/")));

  const hasActiveChild = (() => {
    if (!children) return false;
    const check = (nodes: MenuItemProps[]): boolean =>
      nodes.some(
        (n) =>
          (!!n.href && normalize(n.href) === cleanPath) ||
          (!!n.href && cleanPath.startsWith(normalize(n.href) + "/")) ||
          (!!n.children && check(n.children))
      );
    return check(children);
  })();

  const parentActive = isActive || hasActiveChild;
  const [open, setOpen] = useState<boolean>(hasActiveChild);
  useEffect(() => setOpen(hasActiveChild), [hasActiveChild]);

  const padding = getPaddingClass(depth);

  // Nếu có children → dropdown
  if (children && children.length > 0) {
    return (
      <li>
        <button
          onClick={() => setOpen((s) => !s)}
          aria-expanded={open}
          className={clsx(
            padding,
            "flex items-center justify-between rounded-md text-sm font-medium transition py-2.5",
            {
              "bg-blue-500 text-white w-full": parentActive,
              "text-gray-600 hover:bg-gray-50 w-full": !parentActive,
            }
          )}
        >
          <span className="flex items-center space-x-2">
            {icon && <i className={icon} aria-hidden />}
            <span>{label}</span>
          </span>

          {/* NOTE: hyphenated class keys must be quoted in object literals to avoid parsing as `rotate - 90` */}
          <i
            className={clsx(
              "fas fa-chevron-right text-gray-400 text-xs transition-transform",
              { "rotate-90": open }
            )}
          />
        </button>

        <ul
          className={clsx(open ? "block" : "hidden", "mt-1 pl-2 space-y-2 w-full")}
          role="menu"
        >
          {children.map((child, idx) => (
            <Admin
              key={child.href ?? `${child.label}-${idx}`}
              {...child}
              depth={depth + 1}
            />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href || "#"}
        className={clsx(
          padding,
          "flex items-center space-x-2 py-2.5 rounded-md text-sm font-medium transition",
          {
            "bg-blue-500 text-white": isActive && depth === 0,
            "text-blue-500": isActive && depth !== 0,
            "text-gray-600 hover:text-blue-500": !isActive,
          }
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {icon && <i className={icon} aria-hidden />}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Admin;
