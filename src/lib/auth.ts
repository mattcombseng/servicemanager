import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Role } from "@prisma/client";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export type AppRole = Role;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleProvider = Boolean(googleClientId && googleClientSecret);

const providers: AuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const isValid = await compare(credentials.password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (hasGoogleProvider) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      allowDangerousEmailAccountLinking: false,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      const normalizedEmail = user.email.toLowerCase();

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, role: true, customer: { select: { id: true } } },
      });

      if (!existing) {
        return false;
      }

      // Google provider is intentionally restricted to customer accounts.
      if (existing.role === "STAFF") {
        return false;
      }

      if (!existing.customer) {
        await prisma.customer.create({
          data: {
            userId: existing.id,
            name: user.name ?? user.email ?? "Customer",
            email: user.email ?? null,
          },
        });
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "CUSTOMER" },
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      } else if (token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (token.role ?? user?.role ?? "CUSTOMER") as Role;
      }
      return session;
    },
  },
};
