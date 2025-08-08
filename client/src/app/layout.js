import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { unstable_ViewTransition as ViewTransition } from 'react';

import { Toaster } from "sonner";
import Footer from '@/components/Footer'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const Ubuntu_Medium = localFont({
  src: "./fonts/Ubuntu_Medium.ttf",
  variable: "--font-ubuntu-medium",
});

export const metadata = {
  title: "MIST Computer Club",
  description: "MIST Computer Club is one of the finest clubs of MIST that is supervised by our experienced, cooperative and so many helpful faculty members",
};

export default function RootLayout({ children }) {
  return (
    <ViewTransition>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} ${Ubuntu_Medium.className} font-[--font-ubuntu-medium]`} cz-shortcut-listen="true">
        <Toaster />
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        <Navbar />
        {children}
        <Footer />
        </ThemeProvider>
      </body>
      </html>
    </ViewTransition>
  );
}
