"use client";

import { useEffect, useState } from "react";

type Option = { label: string; price: number; period: string };

type Membership = {
  id: string;
  name: string;
  description: string | null;
  options: string;
  active: boolean;
  createdAt: string;
  _count: { members: number };
};

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Membership | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/memberships");
    if (res.ok) setMemberships(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this membership? Members on this plan won't be affected.")) return;
    const res = await fetch(`/api/memberships/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function handleToggleActive(m: Membership) {
    await fetch(`/api/memberships/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !m.active }),
    });
    load();
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 mb-1">Memberships</h1>
          <p className="text-sm text-stone-500">
            {memberships.length} plan{memberships.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700"
        >
          + Add membership
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-stone-500 text-sm">Loading…</div>
      ) : memberships.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-2">◇</div>
          <h3 className="text-lg font-medium text-stone-900 mb-1">No memberships yet</h3>
          <p className="text-sm text-stone-500 mb-4">
            Create your first plan — any name, any price, any time period.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700"
          >
            + Add membership
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {memberships.map((m) => {
            let options: Option[] = [];
            try {
              options = JSON.parse(m.options || "[]");
            } catch {}

            return (
              <div key={m.id} className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-stone-900 truncate">{m.name}</h3>
                      {!m.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-stone-500 line-clamp-2">{m.description}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-stone-100 my-3" />

                <div className="space-y-1.5 mb-4">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-stone-700">{opt.label}</span>
                      <span className="text-stone-900 font-medium">
                        ${opt.price.toFixed(2)} <span className="text-stone-400 font-normal">{opt.period}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <span className="text-xs text-stone-500">
                    {m._count.members} member{m._count.members === 1 ? "" : "s"}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleActive(m)}
                      className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100"
                    >
                      {m.active ? "Deactivate" : "Activate"}
                    </button>
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
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAdd || editing) && (
        <MembershipModal
          membership={editing}
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

function MembershipModal({
  membership,
  onClose,
  onSaved,
}: {
  membership: Membership | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!membership;
  const initialOptions: Option[] = (() => {
    if (!membership) return [{ label: "Monthly", price: 0, period: "per month" }];
    try {
      return JSON.parse(membership.options);
    } catch {
      return [{ label: "Monthly", price: 0, period: "per month" }];
    }
  })();

  const [name, setName] = useState(membership?.name || "");
  const [description, setDescription] = useState(membership?.description || "");
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateOption(i: number, key: keyof Option, value: any) {
    const copy = [...options];
    (copy[i] as any)[key] = value;
    setOptions(copy);
  }

  function addOption() {
    setOptions([...options, { label: "", price: 0, period: "" }]);
  }

  function removeOption(i: number) {
    setOptions(options.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url = isEdit ? `/api/memberships/${membership!.id}` : "/api/memberships";
    const method = isEdit ? "PATCH" : "POST";

    const cleanOptions = options
      .filter((o) => o.label.trim() && o.period.trim())
      .map((o) => ({ ...o, price: Number(o.price) || 0 }));

    if (cleanOptions.length === 0) {
      setError("Add at least one purchase option");
      setSaving(false);
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, options: cleanOptions }),
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
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            {isEdit ? "Edit membership" : "Create membership"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Plan name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Full Access, Kids 8-12, Summer Camp"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Purchase options
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(i, "label", e.target.value)}
                    placeholder="Option name"
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                  <span className="text-stone-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={opt.price}
                    onChange={(e) => updateOption(i, "price", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                  <input
                    type="text"
                    value={opt.period}
                    onChange={(e) => updateOption(i, "period", e.target.value)}
                    placeholder="per month"
                    className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-stone-400 hover:text-red-600 text-lg leading-none w-5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-stone-600 hover:text-stone-900"
              >
                + Add another option
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Period can be anything: "per month", "one-time", "per season", "lifetime"
            </p>
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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
