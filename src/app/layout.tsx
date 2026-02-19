import "./globals.css";
import { AuthProvider } from "@lib/auth";
import { Header } from "@components/Header";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "EduMatrix",
  description:
    "EduMatrix provides transparent, timely communication between professors and parents. Parents can track attendance, internal marks, and mentor notes for their ward."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen pastel-gradient">
            <div className="mx-auto max-w-6xl px-4">
              <Header />
            </div>
            <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}


