import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/toaster";
import { Topbar } from "@/components/topbar";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
