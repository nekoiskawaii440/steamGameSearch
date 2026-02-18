"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

interface UserMenuProps {
  user: {
    name: string;
    image: string;
    id: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations("nav");

  const handleLogout = async () => {
    // セッションCookieを削除
    document.cookie =
      "authjs.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "__Secure-authjs.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure";
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-3">
      {user.image && (
        <Image
          src={user.image}
          alt={user.name}
          width={36}
          height={36}
          className="rounded-full"
        />
      )}
      <span className="text-sm font-medium text-gray-200">
        {user.name}
      </span>
      <button
        onClick={handleLogout}
        className="rounded-md px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
      >
        {t("logout")}
      </button>
    </div>
  );
}
