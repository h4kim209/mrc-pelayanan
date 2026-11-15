import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Layout from "@/components/layout/layout";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MRC Aplikasi Peminjaman Barang Sekolah",
  description: "Sistem pencatatan peminjaman barang sekolah",
  ...(process.env.NODE_ENV === "production" && {
    manifest: "/manifest.json",
    themeColor: "#0ea5e9",
  }),
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <link rel="apple-touch-icon" href="/mrc-icon.png" />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Layout>{children}</Layout>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
