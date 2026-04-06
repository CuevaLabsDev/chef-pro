import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";
import { getUserContextById, hasAnyPermission } from "@/modules/identity-access/service";

export default async function DailyCountsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserContextById(session.user.id);
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, ["counts.record", "counts.view", "counts.configure"])) {
    redirect(getDefaultHomePath(user));
  }

  return (
    <AppShell user={{ name: user.name, role: user.role, permissionKeys: user.permissionKeys }}>
      {children}
    </AppShell>
  );
}
