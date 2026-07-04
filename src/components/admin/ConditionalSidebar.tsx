"use client";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

// Sidebar is for authenticated admin sections. On login + setup we hide it so
// the auth form is the only thing on screen — no "where am I" navigation
// before the user has proved anything.
const HIDE_SIDEBAR = new Set(["/admin/login", "/admin/setup"]);

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname && HIDE_SIDEBAR.has(pathname)) return null;
  return <AdminSidebar />;
}