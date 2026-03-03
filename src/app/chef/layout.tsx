import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChefNav } from "@/components/chef/nav";
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
    <div className="min-h-screen bg-gray-50">
      <ChefNav
        user={{
          name: user.name,
          role: user.role,
          canReadPackets: user.permissionKeys.includes("packets.read"),
        }}
      />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
