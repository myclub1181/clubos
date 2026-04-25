"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "PROSPECT" | "INACTIVE" | "PAUSED";
  tags: string;
  dateOfBirth: string | null;
  notes: string | null;
  joinedAt: string;
  membership?: { name: string } | null;
};

const statusColors: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: "#EAF3DE", fg: "#27500A" },
  PROSPECT: { bg: "#E6F1FB", fg: "#0C447C" },
  INACTIVE: { bg: "#F1EFE8", fg: "#5F5E5A" },
  PAUSED: { bg: "#FAEEDA", fg: "#633806" },
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/members");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = members.filter((m) => {
    if (filter !== "ALL" && m.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.tags.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    ALL: members.length,
    ACTIVE: members.filter((m) => m.status === "ACTIVE").length,
    PROSPECT: members.filter((m) => m.status === "PROSPECT").length,
    INACTIVE: members.filter((m) => m.status === "INACTIVE").length,
    PAUSED: members.filter((m) => m.status === "PAUSED").length,
  };

  async function handleDelete(id: string) {
    if (!confirm("Remove this member? This can be undone in settings.")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 mb-1">Members</h1>
          <p className="text-sm text-stone-500">{members.length} total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700"
        >
          + Add member
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {(["ALL", "ACTIVE", "PROSPECT", "INACTIVE", "PAUSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${
                filter === s ? "bg-white shadow-sm text-stone-900 font-medium" : "text-stone-600"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s]})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-2">◉</div>
            <h3 className="text-lg font-medium text-stone-900 mb-1">No members yet</h3>
            <p className="text-sm text-stone-500 mb-4">Add your first member to get started.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700"
            >
              + Add member
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Tags</Th>
                <Th>Membership</Th>
                <Th>Joined</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const c = statusColors[m.status];
                return (
                  <tr key={m.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-700">
                          {m.firstName[0]}{m.lastName[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-stone-900">
                            {m.firstName} {m.lastName}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: c.bg, color: c.fg }}
                      >
                        {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap">
                        {m.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((t) => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              {t}
                            </span>
                          ))}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-stone-700">
                        {m.membership?.name || <span className="text-stone-400">—</span>}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-stone-500">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setEditing(m)}
                          className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(showAdd || editing) && (
        <MemberModal
          member={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-5 py-3">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-3">{children}</td>;
}

function MemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!member;
  const [firstName, setFirstName] = useState(member?.firstName || "");
  const [lastName, setLastName] = useState(member?.lastName || "");
  const [status, setStatus] = useState(member?.status || "PROSPECT");
  const [tags, setTags] = useState(member?.tags || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(member?.notes || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url = isEdit ? `/api/members/${member!.id}` : "/api/members";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        status,
        tags,
        dateOfBirth: dateOfBirth || undefined,
        notes,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.toString() || "Save failed");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            {isEdit ? "Edit member" : "Add member"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Beginner, 14U, Travel team"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <p className="text-xs text-stone-400 mt-1">Comma-separated</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
