import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // Steam 64-bit ID
      name: string;
      image: string;
      email?: string;
    };
  }

  interface User {
    id: string;
    name: string;
    image: string;
    email?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string; // Steam 64-bit ID
  }
}
