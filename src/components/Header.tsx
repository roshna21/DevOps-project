 'use client';
import Link from "next/link";
import React from "react";
import { Button } from "./Button";
import { useAuth } from "@lib/auth";
import { PastelBadge } from "./PastelBadge";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="w-full flex items-center justify-between py-4">
      <Link href="/" className="text-xl font-bold tracking-tight">
        EduMatrix
      </Link>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <PastelBadge color="slate" className="hidden sm:inline-flex">
              {user.role === "parent" ? "Parent" : user.role === "professor" ? "Professor" : "Admin"}
            </PastelBadge>
            {user.role === "parent" && (
              <Link href="/dashboard/parent">
                <Button variant="secondary">Parent Dashboard</Button>
              </Link>
            )}
            {user.role === "professor" && (
              <Link href="/dashboard/professor">
                <Button variant="secondary">Professor Dashboard</Button>
              </Link>
            )}
            {user.role === "admin" && (
              <Link href="/admin">
                <Button variant="secondary">Admin</Button>
              </Link>
            )}
            <Button onClick={signOut}>Sign Out</Button>
          </>
        ) : (
          <>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Register Now</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}


