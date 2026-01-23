import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Toaster } from "sonner";
import { AppProvider } from "@/lib/context";
import { WalletProvider } from "@/lib/wallet-context";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { ReferralHandler } from "@/components/referral-handler";
import { FeaturedTokensBar } from "@/components/featured-tokens-bar";

export const metadata: Metadata = {
    title: "Flip Finance - Solana Trading Terminal",
    description: "Professional Solana Trading Terminal - Trade, Track & Earn",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Flip Finance",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/logo.png", type: "image/png" },
      ],
      shortcut: "/logo.png",
      apple: "/logo.png",
    },
  };

  export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: 0,
    themeColor: "#0b0e11",
  };
  
  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
      return (
        <html lang="en" className="dark" data-scroll-behavior="smooth">
          <head>
            <link rel="icon" href="/logo.png" type="image/png" />
            <link rel="shortcut icon" href="/logo.png" type="image/png" />
            <link rel="apple-touch-icon" href="/logo.png" />
          </head>
        <body className="antialiased bg-[#0b0e11] text-white">
        <AppProvider>
          <WalletProvider>
            <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
                  <FeaturedTokensBar />
                  {children}
                </main>
              <MobileNav />
            </div>
            <Toaster 
              position="bottom-right" 
              theme="dark"
              toastOptions={{
                style: {
                  background: '#0d1117',
                  border: '1px solid #1e2329',
                  color: '#fff',
                },
              }}
            />
          </WalletProvider>
        </AppProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
