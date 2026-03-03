import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OpsNav } from "@/components/ops/nav";
import {
  getUserContextById,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
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
  ]);
  if (!canAccessOps) redirect(getDefaultHomePath(user));

  return (
    <div className="min-h-screen bg-gray-50">
      <OpsNav
        user={{
          name: user.name,
          role: user.role,
          canManagePermissions: hasPermission(user, "permissions.manage"),
        }}
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
