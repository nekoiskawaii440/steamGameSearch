import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import UserMenu from "@/components/auth/UserMenu";
import LanguageSwitcher from "@/components/auth/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Steam Game Finder",
  description:
    "Analyze your Steam play data and discover games tailored to your preferences",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const session = await auth();

  return (
    <html lang={locale} className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0e1621] font-sans text-gray-100 antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {/* ナビゲーション */}
          <nav className="sticky top-0 z-50 border-b border-gray-800 bg-[#1b2838]/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-lg font-bold text-[#66c0f4]"
                >
                  Steam Game Finder
                </Link>
                {session?.user && (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/recommendations"
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      Recommendations
                    </Link>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                {session?.user && (
                  <UserMenu
                    user={{
                      name: session.user.name,
                      image: session.user.image,
                      id: session.user.id,
                    }}
                  />
                )}
              </div>
            </div>
          </nav>

          {/* メインコンテンツ */}
          <main className="mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
