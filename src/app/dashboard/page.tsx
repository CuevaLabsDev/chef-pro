import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserContextById } from "@/modules/identity-access/service";
import { getDefaultHomePath } from "@/modules/identity-access/middleware";

export default async function DashboardRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getUserContextById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  redirect(getDefaultHomePath(user));
}
