"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AuthLink = {
  href: string;
  label: string;
};

type AuthLinksProps = {
  links?: AuthLink[];
  showRoleQuery?: boolean;
};

function AuthLinksInner({
  links,
  showRoleQuery = true,
}: AuthLinksProps) {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const roleQuery =
    showRoleQuery && roleParam ? `?role=${encodeURIComponent(roleParam)}` : "";

  const resolvedLinks = links ?? [
    { href: "/forgot-password", label: "Forgot password?" },
    { href: "/verify-email", label: "Verify email" },
  ];

  return (
    <div className="auth-links">
      {resolvedLinks.map((item, index) => (
        <span key={`${item.href}-${item.label}`}>
          {index > 0 ? <span className="muted"> · </span> : null}
          <Link href={`${item.href}${roleQuery}`}>{item.label}</Link>
        </span>
      ))}
    </div>
  );
}

export function AuthLinks(props: AuthLinksProps) {
  return (
    <Suspense fallback={null}>
      <AuthLinksInner {...props} />
    </Suspense>
  );
}
