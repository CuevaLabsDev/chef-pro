import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";
import { getUserContextById, hasPermission } from "@/modules/identity-access/service";

export default async function MenuSignageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserContextById(session.user.id);
  if (!user) redirect("/login");
  if (!hasPermission(user, "packets.read")) {
    redirect(getDefaultHomePath(user));
  }

  return (
    <AppShell user={{ name: user.name, role: user.role, permissionKeys: user.permissionKeys }}>
      {children}
    </AppShell>
  );
}
