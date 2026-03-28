import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const role = roleParam === "staff" ? "STAFF" : "CUSTOMER";
  const inviteToken = Array.isArray(params.invite) ? params.invite[0] : params.invite;

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Create {role === "STAFF" ? "Staff" : "Customer"} Account</h1>
        <p className="muted">
          {role === "STAFF"
            ? "Staff accounts require a valid invite token from an existing staff member."
            : "Customer accounts can self-schedule appointments and optionally use Google sign-in."}
        </p>
        {role === "CUSTOMER" ? (
          <p className="muted">
            New accounts must verify email before credential sign-in.
          </p>
        ) : null}
        {role === "STAFF" && !inviteToken ? (
          <p className="error-text">
            A staff invite token is required. Use the invite link provided by an administrator.
          </p>
        ) : (
          <RegisterForm role={role} inviteToken={role === "STAFF" ? inviteToken : undefined} />
        )}
        <p className="muted">
          Need a different account type?{" "}
          <Link href={role === "STAFF" ? "/register?role=customer" : "/register?role=staff"}>
            Switch to {role === "STAFF" ? "customer" : "staff"} registration
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
