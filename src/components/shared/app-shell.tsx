import { AppSidebar } from "@/components/shared/app-sidebar";

interface AppShellProps {
  user: {
    name: string;
    role: string;
    permissionKeys: string[];
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={user} />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
