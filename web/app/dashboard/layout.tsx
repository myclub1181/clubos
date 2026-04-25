"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const navItems = [
  { id: "overview", label: "Dashboard", icon: "⌂", href: "/dashboard" },
  { id: "members", label: "Members", icon: "◉", href: "/dashboard/members" },
  { id: "calendar", label: "Calendar", icon: "▦", href: "/dashboard/calendar" },
  { id: "events", label: "Events", icon: "◈", href: "/dashboard/events" },
  { id: "memberships", label: "Memberships", icon: "◇", href: "/dashboard/memberships" },
  { id: "messages", label: "Messages", icon: "✉", href: "/dashboard/messages" },
  { id: "financials", label: "Financials", icon: "$", href: "/dashboard/financials" },
  { id: "documents", label: "Documents", icon: "▤", href: "/dashboard/documents" },
  { id: "staff", label: "Staff", icon: "◎", href: "/dashboard/staff" },
  { id: "settings", label: "Settings", icon: "⚙", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-sm text-stone-500">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-stone-50">
      <aside className="w-60 bg-white border-r border-stone-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-stone-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-stone-900 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-white" />
            </div>
            <span className="font-medium text-stone-900">ClubOS</span>
          </div>
          <div className="text-xs text-stone-500 truncate">{session.user.email}</div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-0.5 transition ${
                  active
                    ? "bg-stone-900 text-white font-medium"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-sm px-3 py-2 rounded-md border border-stone-200 text-stone-700 hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
