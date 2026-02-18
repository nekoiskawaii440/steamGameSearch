// ルート layout は [locale]/layout.tsx に委譲
// このファイルは Next.js が要求するため存在する
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
