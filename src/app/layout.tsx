import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BluEduca - App dos Pais",
  description: "Portal de comunicação e acompanhamento escolar para pais e responsáveis.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0284c7', // brand-600
  viewportFit: 'cover',
};

import QueryProvider from '@/providers/QueryProvider';
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900 font-sans">
        <QueryProvider>
          {children}
        </QueryProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(registration) {
                console.log('SW registered: ', registration);
              }, function(err) {
                console.log('SW registration failed: ', err);
              });
            });
          }
        `}} />
      </body >
    </html >
  );
}
