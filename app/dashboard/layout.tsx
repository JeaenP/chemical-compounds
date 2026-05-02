import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/navbar/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen w-full bg-slate-50/50">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 min-w-0 lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
