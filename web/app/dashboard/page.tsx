"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
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
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-stone-900 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-white" />
            </div>
            <span className="font-medium text-stone-900">ClubOS</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-stone-700">
              {session.user.name}
              <span className="text-stone-400 ml-2">({session.user.role})</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm px-3 py-1.5 rounded-md border border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold text-stone-900 mb-2">
          Welcome, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-stone-500 mb-8">
          Your dashboard is protected by authentication.
        </p>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-lg font-medium text-stone-900 mb-4">Session info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">User ID</span>
              <span className="text-stone-900 font-mono text-xs">{session.user.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Email</span>
              <span className="text-stone-900">{session.user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Role</span>
              <span className="text-stone-900">{session.user.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone-500">Club ID</span>
              <span className="text-stone-900 font-mono text-xs">{session.user.clubId}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          ✓ Authentication is working. This page is only accessible when logged in.
        </div>
      </main>
    </div>
  );
}
