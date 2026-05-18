import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { getUserContextById, hasAnyPermission } from "@/modules/identity-access/service";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserContextById(session.user.id);
  if (!user) redirect("/login");

  const canAccessOps = hasAnyPermission(user, [
    "reviews.manage",
    "config.manage",
    "reports.view",
    "notifications.view",
    "compliance.view",
  ]);
  if (!canAccessOps) redirect(getDefaultHomePath(user));

  return (
    <AppShell user={{ name: user.name, role: user.role, permissionKeys: user.permissionKeys }}>
      {children}
    </AppShell>
  );
}
