"use client";

import { useTranslations } from "next-intl";

export default function LoginButton() {
  const t = useTranslations("nav");

  return (
    <a
      href="/api/auth/steam"
      className="inline-flex items-center gap-3 rounded-lg bg-[#1b2838] px-6 py-3 text-white font-medium transition-colors hover:bg-[#2a475e] focus:outline-none focus:ring-2 focus:ring-[#66c0f4] focus:ring-offset-2"
    >
      <SteamIcon />
      {t("login")}
    </a>
  );
}

function SteamIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15.5l-2.5-1.1c-.3.2-.7.3-1 .3-1.1 0-2-.9-2-2s.9-2 2-2c.1 0 .2 0 .3 0l2.8-2c.1-1.2 1.1-2.2 2.4-2.2 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4-.3 0-.6-.1-.9-.2l-2 2.8c0 .1 0 .2 0 .3 0 .3-.1.7-.3 1l1.1 2.5h6.4c.5-1 .9-2.1 1-3.3.1-.5.1-1 .1-1.5C22 6.48 17.52 2 12 2z" />
    </svg>
  );
}
