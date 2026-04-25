"use client";

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-semibold text-stone-900 mb-2">
        Welcome, {session.user.name.split(" ")[0]}
      </h1>
      <p className="text-stone-500 mb-8">
        Here's what's happening at your club today.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Active members" value="—" hint="Add your first member" />
        <StatCard label="MRR" value="$0" hint="Set up memberships" />
        <StatCard label="This week's bookings" value="0" hint="No bookings yet" />
        <StatCard label="Outstanding balance" value="$0" hint="All caught up" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-lg font-medium text-stone-900 mb-2">Get started</h2>
        <p className="text-sm text-stone-500 mb-4">
          A few things to set up to make the most of ClubOS.
        </p>
        <div className="space-y-2">
          <Task label="Add your first member" href="/dashboard/members" done={false} />
          <Task label="Create a membership plan" href="/dashboard/memberships" done={false} />
          <Task label="Schedule your first event" href="/dashboard/events" done={false} />
          <Task label="Connect Stripe for payments" href="/dashboard/settings" done={false} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-semibold text-stone-900 mb-1">{value}</div>
      <div className="text-xs text-stone-400">{hint}</div>
    </div>
  );
}

function Task({ label, href, done }: { label: string; href: string; done: boolean }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200 transition"
    >
      <div
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs"
        style={{
          borderColor: done ? "#1D9E75" : "#D6D3D1",
          background: done ? "#1D9E75" : "transparent",
          color: "white",
        }}
      >
        {done && "✓"}
      </div>
      <span className={`text-sm flex-1 ${done ? "line-through text-stone-400" : "text-stone-800"}`}>
        {label}
      </span>
      <span className="text-xs text-stone-400">→</span>
    </a>
  );
}
