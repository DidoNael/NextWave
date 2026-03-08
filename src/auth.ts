import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials, req) => {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        // 1. Validação de IP (se configurado)
        if (user.allowedIps && user.allowedIps !== "*") {
          const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
          const allowedIps = user.allowedIps.split(",").map(ip => ip.trim());
          if (!allowedIps.includes(clientIp)) {
            throw new Error("Acesso não permitido deste endereço IP.");
          }
        }

        // 2. Validação de Horário (se configurado)
        if (user.workDayStart && user.workDayEnd) {
          const now = new Date();
          const currentTime = now.getHours() * 60 + now.getMinutes();

          const [startH, startM] = user.workDayStart.split(":").map(Number);
          const [endH, endM] = user.workDayEnd.split(":").map(Number);

          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;

          if (currentTime < startTime || currentTime > endTime) {
            throw new Error("Acesso fora do horário de trabalho permitido.");
          }
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
