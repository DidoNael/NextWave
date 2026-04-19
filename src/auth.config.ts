import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/login", // Redireciona erros de volta para o login
    },
    session: {
        strategy: "jwt",
        maxAge: 7200, // 2 horas (7200 segundos)
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isAuthPage = nextUrl.pathname === "/login" || nextUrl.pathname === "/setup";
            const isApiRoute = nextUrl.pathname.startsWith("/api");

            if (isApiRoute) return true;
            if (!isLoggedIn && !isAuthPage) return false;
            if (isLoggedIn && isAuthPage) {
                return Response.redirect(new URL("/", nextUrl));
            }
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    providers: [], // Preenchido no auth.ts
} satisfies NextAuthConfig;
