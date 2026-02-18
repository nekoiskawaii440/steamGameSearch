import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

function getBaseUrl() {
  return process.env.AUTH_URL || "http://localhost:3000";
}

// Steam OpenID 2.0 の返却パラメータを検証
async function verifySteamLogin(
  params: URLSearchParams
): Promise<string | null> {
  const verifyParams = new URLSearchParams();
  for (const [key, value] of params) {
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

  const claimedId = params.get("openid.claimed_id");
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

  try {
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
  } catch {
    return { id: steamId, name: `Steam User ${steamId}`, image: "" };
  }
}

// Steam OpenID コールバック処理
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const steamId = await verifySteamLogin(searchParams);
  if (!steamId) {
    return NextResponse.redirect(
      new URL("/?error=auth_failed", getBaseUrl())
    );
  }

  const profile = await getSteamProfile(steamId);

  // JWT セッショントークンを作成
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(
      new URL("/?error=config_error", getBaseUrl())
    );
  }

  const isSecure = getBaseUrl().startsWith("https");

  // Auth.js が使う Cookie 名
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      sub: profile.id,
      name: profile.name,
      picture: profile.image,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    },
    secret,
    salt: cookieName,
  });

  // セッションCookieを設定してダッシュボードにリダイレクト
  const response = NextResponse.redirect(
    new URL("/ja/dashboard", getBaseUrl())
  );

  // response オブジェクトに Cookie を設定する（cookieStore への set は無効）
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
