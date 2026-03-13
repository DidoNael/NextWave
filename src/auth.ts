import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        twoFactorCode: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: String(credentials.email) },
          });

          if (!user || !user.password) {
            console.log("User not found or no password:", credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            String(credentials.password),
            user.password
          );

          if (!isPasswordValid) {
            console.log("Invalid password for user:", credentials.email);
            return null;
          }

          if (user.twoFactorEnabled && !credentials.twoFactorCode) {
            console.log("2FA required for user:", credentials.email);
            // No Auth.js v5, lançar um erro com uma mensagem específica 
            // costuma resultar em CredentialsSignin com essa mensagem
            throw new Error("2FA_REQUIRED");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error: any) {
          console.error("Authorize error detail:", error);
          // Re-throw if it's our 2FA marker
          if (error.message === "2FA_REQUIRED") throw error;
          return null;
        }
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: true, // Habilitar debug para ver erro de configuration no terminal
});
