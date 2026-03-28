import type { Role } from "@prisma/client";

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}
