"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Kind = "event" | "class" | "private";

type CalItem = {
  kind: Kind;
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  typeKey: string;
  typeLabel: string;
  color: string | null;
  textColor: string | null;
  capacity: number | null;
  filled: number;
  detail?: string;
};

type CalFeed = {
  from: string;
  to: string;
  items: CalItem[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const KIND_COLORS: Record<Kind, { bg: string; fg: string; label: string; href: string }> = {
  event:   { bg: "var(--color-warning)", fg: "#fff",                 label: "Events",          href: "/dashboard/events" },
  class:   { bg: "var(--color-primary)", fg: "#fff",                 label: "Classes",         href: "/dashboard/classes" },
  private: { bg: "#E8E1FD",              fg: "#3B2F8C",              label: "Private lessons", href: "/dashboard/privates" },
};

// Built-in event subtypes (when no customEventType is set)
const EVENT_SUBTYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  CLASS:      { bg: "var(--color-primary)", fg: "#fff" },
  PRIVATE:    { bg: "#E8E1FD",              fg: "#3B2F8C" },
  CLINIC:     { bg: "var(--color-success)", fg: "var(--color-text)" },
  CAMP:       { bg: "var(--color-warning)", fg: "#fff" },
  TOURNAMENT: { bg: "#FCE4E0",              fg: "#7B2415" },
  OTHER:      { bg: "var(--color-bg)",      fg: "var(--color-muted)" },
};

function colorFor(item: CalItem): { bg: string; fg: string } {
  if (item.color) return { bg: item.color, fg: item.textColor ?? "#fff" };
  if (item.kind === "event") return EVENT_SUBTYPE_COLORS[item.typeKey] ?? EVENT_SUBTYPE_COLORS.OTHER;
  if (item.kind === "class") return KIND_COLORS.class;
  return KIND_COLORS.private;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [feed, setFeed] = useState<CalFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalItem | null>(null);

  // Filter state
  const [kindFilter, setKindFilter] = useState<Set<Kind>>(new Set(["event", "class", "private"]));
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set()); // empty = all subtypes

  useEffect(() => {
    setLoading(true);
    // Pull a 3-month window centered on the visible month so prev/next nav is snappy.
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month + 2, 0, 23, 59, 59, 999);
    fetch(`/api/calendar?from=${start.toISOString()}&to=${end.toISOString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CalFeed | null) => {
        setFeed(d);
        setLoading(false);
      });
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const items = useMemo(() => feed?.items ?? [], [feed]);

  // Build a unique typeLabel set per kind for the secondary filter chips.
  const subtypesInRange = useMemo(() => {
    const map = new Map<string, { kind: Kind; key: string; label: string; color: { bg: string; fg: string } }>();
    for (const it of items) {
      const compound = `${it.kind}:${it.typeKey}`;
      if (!map.has(compound)) {
        map.set(compound, { kind: it.kind, key: compound, label: it.typeLabel, color: colorFor(it) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (!kindFilter.has(it.kind)) return false;
      if (typeFilter.size > 0 && !typeFilter.has(`${it.kind}:${it.typeKey}`)) return false;
      return true;
    });
  }, [items, kindFilter, typeFilter]);

  function toggleKind(k: Kind) {
    setKindFilter((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  function toggleType(key: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build grid cells
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const itemsThisMonth = filteredItems.filter((e) => {
    const d = new Date(e.startsAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  function itemsOnDay(day: number) {
    return itemsThisMonth.filter((e) => new Date(e.startsAt).getDate() === day);
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-1">Calendar</h1>
          <p className="text-sm text-text-muted">All offerings — events, classes, and confirmed private lessons.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/classes" className="px-3 py-2 border border-app-border rounded-lg text-sm text-text-primary hover:bg-app-bg">+ Class</Link>
          <Link href="/dashboard/events" className="px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover">+ Event</Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-surface border border-app-border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider text-text-muted font-medium mr-1">Show</span>
          {(["event", "class", "private"] as Kind[]).map((k) => {
            const active = kindFilter.has(k);
            const c = KIND_COLORS[k];
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active ? "border-transparent text-white" : "border-app-border text-text-muted bg-surface hover:bg-app-bg"
                }`}
                style={active ? { background: c.bg, color: c.fg } : {}}
              >
                {active ? "✓ " : ""}{c.label}
              </button>
            );
          })}
        </div>
        {subtypesInRange.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium mr-1">Type</span>
            {typeFilter.size > 0 && (
              <button
                onClick={() => setTypeFilter(new Set())}
                className="text-[11px] text-text-muted underline mr-1"
              >
                clear
              </button>
            )}
            {subtypesInRange.map((s) => {
              const active = typeFilter.size === 0 || typeFilter.has(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleType(s.key)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    active ? "border-app-border bg-surface" : "border-app-border opacity-40 bg-app-bg"
                  }`}
                >
                  <span className="w-2 h-2 rounded-sm" style={{ background: s.color.bg, border: `1px solid ${s.color.fg}30` }} />
                  <span className="text-text-primary">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-app-border overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-app-bg text-text-muted">‹</button>
          <h2 className="text-base font-semibold text-text-primary">
            {MONTHS[month]} {year}
            <span className="ml-2 text-xs text-text-muted font-normal">
              {filteredItems.filter((e) => {
                const d = new Date(e.startsAt);
                return d.getFullYear() === year && d.getMonth() === month;
              }).length} item{itemsThisMonth.length === 1 ? "" : "s"}
            </span>
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-app-bg text-text-muted">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-app-border">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-text-muted uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayItems = day ? itemsOnDay(day) : [];
              return (
                <div
                  key={i}
                  className={`min-h-[110px] p-1.5 border-b border-r border-app-border ${!day ? "bg-app-bg/50" : ""}`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday(day) ? "bg-brand text-white" : "text-text-primary"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map((it) => {
                          const c = colorFor(it);
                          return (
                            <button
                              key={`${it.kind}-${it.id}`}
                              onClick={() => setSelected(selected?.id === it.id && selected.kind === it.kind ? null : it)}
                              className="w-full text-left text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
                              style={{ background: c.bg, color: c.fg }}
                              title={it.name}
                            >
                              <span className="opacity-70 mr-0.5">
                                {new Date(it.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                              {it.name}
                            </button>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-[10px] text-text-muted px-1">+{dayItems.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected detail */}
      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-app-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-base font-semibold text-text-primary">{selected.name}</h3>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: colorFor(selected).bg, color: colorFor(selected).fg }}
                >
                  {selected.typeLabel}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-app-bg text-text-muted">
                  {KIND_COLORS[selected.kind].label.replace(/s$/, "")}
                </span>
              </div>
              <div className="text-sm text-text-muted">
                {new Date(selected.startsAt).toLocaleString("en-US", {
                  weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                })}
                {" – "}
                {new Date(selected.endsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
              {selected.detail && (
                <div className="text-xs text-text-muted mt-0.5">{selected.detail}</div>
              )}
              {selected.capacity != null && selected.kind !== "private" && (
                <div className="text-sm text-text-muted mt-1">
                  {selected.filled}/{selected.capacity} booked
                </div>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href={KIND_COLORS[selected.kind].href}
              className="text-xs px-3 py-1.5 rounded-md border border-app-border text-text-primary hover:bg-app-bg"
            >
              Open in {KIND_COLORS[selected.kind].label} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
