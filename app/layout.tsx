import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConstantsProvider } from "@/components/providers/ConstantsProvider";

export const metadata: Metadata = {
  title: "Chemical Compounds Manager",
  description: "Gestión de compuestos químicos para análisis cromatográfico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ConstantsProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ConstantsProvider>
      </body>
    </html>
  );
}
