import { redirect } from "next/navigation";

// ルートアクセスはデフォルトロケールにリダイレクト
export default function RootPage() {
  redirect("/ja");
}
