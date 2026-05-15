"use client";

import { Fragment, useEffect, useState } from "react";

type StaffPay = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title: string | null;
  scheduledHours: number;
  classHours: number;
  classSessionCount: number;
  classTeachingDetail: { className: string; date: string; minutes: number }[];
  hourlyRate: number;
  hourlyPay: number;
  salary: number;
  privateLessonCount: number;
  privatePay: number;
  privateLessons: { bookingId: string; lessonTitle: string; pay: number }[];
  totalPay: number;
};

type PayrollResponse = {
  from: string;
  to: string;
  staff: StaffPay[];
  totals: { hourly: number; salary: number; private: number; total: number };
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(key: string): { from: string; to: string; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "this_week") {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end), label: "This week" };
  }
  if (key === "last_week") {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end), label: "Last week" };
  }
  if (key === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISODate(start), to: toISODate(end), label: "This month" };
  }
  if (key === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISODate(start), to: toISODate(end), label: "Last month" };
  }
  // default: this_pay_period assumes bi-weekly ending today
  const start = new Date(today);
  start.setDate(start.getDate() - 13);
  return { from: toISODate(start), to: toISODate(today), label: "Last 14 days" };
}

export default function StaffPayrollPage() {
  const [preset, setPreset] = useState("this_month");
  const [from, setFrom] = useState(() => presetRange("this_month").from);
  const [to, setTo] = useState(() => presetRange("this_month").to);
  const [data, setData] = useState<PayrollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/staff/payroll?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [from, to]);

  function applyPreset(key: string) {
    setPreset(key);
    const r = presetRange(key);
    setFrom(r.from);
    setTo(r.to);
  }

  function downloadCsv() {
    if (!data) return;
    const headers = ["Staff", "Email", "Title", "Scheduled hours", "Class teaching hours", "Class sessions", "Hourly rate", "Hourly pay", "Salary", "Private lessons", "Private pay", "Total"];
    const rows = data.staff.map((s) => [
      `${s.firstName} ${s.lastName}`,
      s.email,
      s.title ?? "",
      s.scheduledHours.toFixed(2),
      s.classHours.toFixed(2),
      String(s.classSessionCount),
      s.hourlyRate.toFixed(2),
      s.hourlyPay.toFixed(2),
      s.salary.toFixed(2),
      String(s.privateLessonCount),
      s.privatePay.toFixed(2),
      s.totalPay.toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Payroll &amp; Payouts</h1>
          <p className="text-sm text-text-muted mt-1">
            Computed from scheduled hours, hourly rates, and completed private lessons.
          </p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={!data || data.staff.length === 0}
          className="text-sm px-3 py-1.5 border border-app-border rounded-lg text-text-primary hover:bg-app-bg disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Range selector */}
      <div className="bg-surface border border-app-border rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1 bg-app-bg rounded-lg p-1">
          {[
            { key: "this_week", label: "This week" },
            { key: "last_week", label: "Last week" },
            { key: "this_month", label: "This month" },
            { key: "last_month", label: "Last month" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${
                preset === p.key ? "bg-surface shadow-sm text-text-primary font-medium" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-0.5">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }}
              className="px-2 py-1 border border-app-border rounded text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-0.5">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset("custom"); }}
              className="px-2 py-1 border border-app-border rounded text-sm bg-surface"
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <p className="text-sm text-text-muted text-center py-16">Loading…</p>
      ) : data.staff.length === 0 ? (
        <div className="bg-surface border border-app-border rounded-xl p-12 text-center">
          <p className="text-base font-medium text-text-primary mb-1">No staff yet</p>
          <p className="text-sm text-text-muted">Add staff first.</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Total label="Hourly pay" value={formatMoney(data.totals.hourly)} />
            <Total label="Salary" value={formatMoney(data.totals.salary)} />
            <Total label="Private lessons" value={formatMoney(data.totals.private)} />
            <Total label="Total payout" value={formatMoney(data.totals.total)} accent />
          </div>

          {/* Table */}
          <div className="bg-surface border border-app-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app-bg border-b border-app-border">
                  <th className="text-left px-4 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Staff</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Scheduled</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Classes</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Rate</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Hourly</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Salary</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Privates</th>
                  <th className="text-right px-3 py-2 font-medium text-text-muted uppercase tracking-wider text-[11px]">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="border-b border-app-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-text-muted">{s.title || (s.role === "OWNER" ? "Owner" : "Staff")}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-text-primary">{s.scheduledHours.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-text-primary">
                        {s.classHours > 0 ? s.classHours.toFixed(2) : "—"}
                        {s.classSessionCount > 0 && (
                          <span className="text-xs text-text-muted ml-1">({s.classSessionCount})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-text-muted">
                        {s.hourlyRate > 0 ? formatMoney(s.hourlyRate) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-text-primary">{formatMoney(s.hourlyPay)}</td>
                      <td className="px-3 py-3 text-right text-text-muted">{s.salary > 0 ? formatMoney(s.salary) : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-text-primary">{formatMoney(s.privatePay)}</span>
                        {s.privateLessonCount > 0 && (
                          <span className="text-xs text-text-muted ml-1">({s.privateLessonCount})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-text-primary">{formatMoney(s.totalPay)}</td>
                      <td className="px-3 py-3 text-right">
                        {s.privateLessons.length > 0 && (
                          <button
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            className="text-xs text-brand hover:underline"
                          >
                            {expanded === s.id ? "Hide" : "Details"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === s.id && (s.privateLessons.length > 0 || s.classTeachingDetail.length > 0) && (
                      <tr className="bg-app-bg">
                        <td colSpan={9} className="px-4 py-3 space-y-3">
                          {s.classTeachingDetail.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-text-muted font-medium mb-1.5">
                                Classes taught
                              </p>
                              <ul className="text-xs space-y-1">
                                {s.classTeachingDetail.map((c, i) => (
                                  <li key={i} className="flex justify-between text-text-primary">
                                    <span>
                                      {c.className}
                                      <span className="text-text-muted ml-1.5">
                                        {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </span>
                                    </span>
                                    <span>{(c.minutes / 60).toFixed(2)} hrs</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {s.privateLessons.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-wider text-text-muted font-medium mb-1.5">
                                Private lessons
                              </p>
                              <ul className="text-xs space-y-1">
                                {s.privateLessons.map((l) => (
                                  <li key={l.bookingId} className="flex justify-between text-text-primary">
                                    <span>{l.lessonTitle}</span>
                                    <span>{l.pay > 0 ? formatMoney(l.pay) : <span className="text-red-600">No pay rate set</span>}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-text-muted mt-3">
            Scheduled hours come from the <a href="/dashboard/staff/availability" className="underline">Availability</a> page (minus date exceptions).
            Per-staff hourly rate and salary are set on the staff Directory edit form. Private lesson pay rates are set per coach + lesson type.
          </p>
        </>
      )}
    </div>
  );
}

function Total({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-brand text-white border-brand" : "bg-surface border-app-border"}`}>
      <p className={`text-xs uppercase tracking-wide mb-1 ${accent ? "text-white/80" : "text-text-muted"}`}>{label}</p>
      <p className={`text-xl font-semibold ${accent ? "text-white" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}
