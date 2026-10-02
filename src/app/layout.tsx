import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/goodz/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goodz Menu · Fundação",
  description: "Prévia local da fundação visual e runtime do Goodz Menu.",
  icons: { icon: "/goodz-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
