import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { getUserContextById, hasAnyPermission } from "@/modules/identity-access/service";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserContextById(session.user.id);
  if (!user) redirect("/login");

  const canAccessChef = hasAnyPermission(user, [
    "tastings.create",
    "tastings.edit",
    "tastings.submit",
  ]);
  if (!canAccessChef) redirect(getDefaultHomePath(user));

  return (
    <AppShell user={{ name: user.name, role: user.role, permissionKeys: user.permissionKeys }}>
      {children}
    </AppShell>
  );
}
