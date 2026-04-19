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
            include: { organization: { select: { slug: true } } }
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
              throw new Error("2FA_REQUIRED");
            }

            // Gerar novo ID de sessão para Single Device Access
            const sessionId = crypto.randomUUID();
            await prisma.user.update({
              where: { id: user.id },
              data: { currentSessionId: sessionId }
            });

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              sessionId: sessionId,
              orgSlug: user.organization?.slug || null,
              organizationId: user.organizationId || null,
              allowedIps: user.allowedIps || "*",
            };
          } catch (error: any) {
            console.error("Authorize error detail:", error);
            if (error.message === "2FA_REQUIRED") throw error;
            return null;
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.sessionId = (user as any).sessionId;
          token.orgSlug = (user as any).orgSlug;
          token.organizationId = (user as any).organizationId;
          token.allowedIps = (user as any).allowedIps ?? "*";
          
          // Captura o IP de origem no momento do login
          try {
            const { headers } = await import("next/headers");
            const headerList = headers();
            const ip = headerList.get("x-forwarded-for")?.split(",")[0].trim() || 
                       headerList.get("x-real-ip") || "unknown";
            token.loginIp = ip;
          } catch (e) {
            token.loginIp = "unknown";
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          try {
            // No Edge Runtime (como no Middleware), o Prisma não pode invocar o banco sem Accelerate/Driver
            if (process.env.NEXT_RUNTIME !== 'edge') {
              // Verificar se a sessão ainda é válida (Single Device Access)
              const user = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { currentSessionId: true, role: true }
              });

              // Atualiza o role sempre com o valor atual do banco
              if (user?.role) token.role = user.role;

              // Se o usuário não existir ou o sessionId for diferente, invalida
              if (user && user.currentSessionId && token.sessionId && user.currentSessionId !== (token.sessionId as string)) {
                console.log(`[AUTH] Sessão inválida para ${session.user.email}. Outro dispositivo logou.`);
                return {
                  ...session,
                  user: { ...session.user, id: "INVALID" }
                } as any;
              }
            }
          } catch (e) {
            console.error("[AUTH] Erro ao validar sessão única:", e);
          }

          session.user.id = token.id as string;
          session.user.role = token.role as string;
          (session.user as any).sessionId = token.sessionId as string;
          (session.user as any).orgSlug = token.orgSlug as string;
          (session.user as any).organizationId = token.organizationId as string;
          (session.user as any).allowedIps = token.allowedIps as string ?? "*";
        }
        return session;
      },
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    debug: true,
  });
