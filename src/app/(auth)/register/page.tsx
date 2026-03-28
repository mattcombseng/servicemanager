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

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Create {role === "STAFF" ? "Staff" : "Customer"} Account</h1>
        <p className="muted">
          {role === "STAFF"
            ? "Staff accounts can manage customers, services, scheduling, and invoicing."
            : "Customer accounts can self-schedule appointments and optionally use Google sign-in."}
        </p>
        <RegisterForm role={role} />
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
