import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getUserContextById } from "@/modules/identity-access/service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { locationAccess: true },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        const userContext = await getUserContextById(user.id);
        if (!userContext) return null;

        return {
          id: userContext.id,
          email: userContext.email,
          name: userContext.name,
          role: userContext.role,
          roleSubtypeId: userContext.roleSubtypeId,
          roleLabel: userContext.roleLabel,
          locationIds: userContext.locationIds,
          permissionKeys: userContext.permissionKeys,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as Record<string, unknown>).role;
        token.roleSubtypeId = (user as unknown as Record<string, unknown>).roleSubtypeId;
        token.roleLabel = (user as unknown as Record<string, unknown>).roleLabel;
        token.locationIds = (user as unknown as Record<string, unknown>).locationIds;
        token.permissionKeys = (user as unknown as Record<string, unknown>).permissionKeys;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).roleSubtypeId = token.roleSubtypeId;
        (session.user as unknown as Record<string, unknown>).roleLabel = token.roleLabel;
        (session.user as unknown as Record<string, unknown>).locationIds = token.locationIds;
        (session.user as unknown as Record<string, unknown>).permissionKeys = token.permissionKeys;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
