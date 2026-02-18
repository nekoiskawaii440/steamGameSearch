import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import LoginButton from "@/components/auth/LoginButton";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;

  // ログイン済みならダッシュボードにリダイレクト
  if (session?.user) {
    redirect({ href: "/dashboard", locale });
  }

  return <LandingContent />;
}

function LandingContent() {
  const t = useTranslations("landing");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-lg text-lg text-gray-400">
        {t("subtitle")}
      </p>

      <LoginButton />

      {/* 機能紹介 */}
      <div className="mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
        <FeatureCard
          title={t("features.analyze")}
          description={t("features.analyzeDesc")}
          icon="📊"
        />
        <FeatureCard
          title={t("features.recommend")}
          description={t("features.recommendDesc")}
          icon="🎮"
        />
        <FeatureCard
          title={t("features.filter")}
          description={t("features.filterDesc")}
          icon="💰"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 text-center">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="mb-2 font-semibold text-gray-200">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
