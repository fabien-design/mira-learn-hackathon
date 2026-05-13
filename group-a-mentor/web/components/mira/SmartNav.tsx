"use client";

import { useAuth } from "@/hooks/useAuth";

import { AdminNav } from "./AdminNav";
import { PublicNav } from "./PublicNav";

export function SmartNav() {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-16 border-b border-rule bg-card" />;

  const isAdmin = user?.user_metadata?.role === "admin";

  return isAdmin ? <AdminNav /> : <PublicNav />;
}
