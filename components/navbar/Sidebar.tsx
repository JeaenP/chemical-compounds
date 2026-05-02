"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  FlaskConical,
  Beaker,
  TableProperties,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { toast } from "sonner";

const NAV = [
  {
    href: "/dashboard/compounds",
    label: "Lista de Compuestos",
    icon: Beaker,
  },
  {
    href: "/dashboard/generate",
    label: "Generar Tabla",
    icon: TableProperties,
  },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Chemical Compounds</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "pt-14 lg:pt-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden lg:flex h-16 items-center gap-3 border-b px-6">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                Chemical Compounds
              </p>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3 space-y-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Sesión
              </p>
              <p className="text-sm font-medium truncate">{email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="lg:hidden h-14" />
    </>
  );
}
