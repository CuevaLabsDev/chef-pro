import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PacketsNav } from "@/components/packets/nav";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";
import { getUserContextById, hasPermission } from "@/modules/identity-access/service";

export default async function PacketsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserContextById(session.user.id);
  if (!user) redirect("/login");
  if (!hasPermission(user, "packets.read")) {
    redirect(getDefaultHomePath(user));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PacketsNav
        user={{
          name: user.name,
          canManageStructure: hasPermission(user, "packets.manage_structure"),
          canExecute: hasPermission(user, "packets.execute"),
          canManagePermissions: hasPermission(user, "permissions.manage"),
        }}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
