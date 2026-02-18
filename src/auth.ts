import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

function getBaseUrl() {
  return process.env.AUTH_URL || "http://localhost:3000";
}

// Steam OpenID 2.0 の返却パラメータからSteam IDを検証・抽出
async function verifySteamLogin(
  params: Record<string, string>
): Promise<string | null> {
  // OpenID 2.0 の検証リクエストを Steam に送信
  const verifyParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  if (!text.includes("is_valid:true")) {
    return null;
  }

  // claimed_id から Steam ID を抽出
  // 形式: https://steamcommunity.com/openid/id/76561198012345678
  const claimedId = params["openid.claimed_id"];
  const match = claimedId?.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
  );
  return match ? match[1] : null;
}

// Steam Web API でユーザー情報を取得
async function getSteamProfile(steamId: string) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return { id: steamId, name: `Steam User ${steamId}`, image: "" };
  }

  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
  );

  if (!res.ok) {
    return { id: steamId, name: `Steam User ${steamId}`, image: "" };
  }

  const data = await res.json();
  const player = data.response?.players?.[0];

  if (!player) {
    return { id: steamId, name: `Steam User ${steamId}`, image: "" };
  }

  return {
    id: steamId,
    name: player.personaname || `Steam User ${steamId}`,
    image: player.avatarfull || player.avatar || "",
  };
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: "steam",
      name: "Steam",
      credentials: {},
      async authorize(credentials, request) {
        // Steam OpenID のコールバックパラメータを処理
        const url = new URL(request.url || "");
        const params: Record<string, string> = {};
        for (const [key, value] of url.searchParams) {
          params[key] = value;
        }

        // credentials からも取得（フォーム送信の場合）
        if (credentials && typeof credentials === "object") {
          for (const [key, value] of Object.entries(credentials)) {
            if (typeof value === "string") {
              params[key] = value;
            }
          }
        }

        if (!params["openid.claimed_id"]) {
          return null;
        }

        const steamId = await verifySteamLogin(params);
        if (!steamId) {
          return null;
        }

        const profile = await getSteamProfile(steamId);
        return profile;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.name) {
        session.user.name = token.name;
      }
      if (token.picture) {
        session.user.image = token.picture;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
