import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // Route authorization is handled via callbacks below.
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (!token) return false;

        const role = token.role as string | undefined;
        if (path.startsWith("/staff")) {
          return role === "STAFF";
        }
        if (path.startsWith("/customer")) {
          return role === "CUSTOMER";
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/staff/:path*", "/customer/:path*"],
};
