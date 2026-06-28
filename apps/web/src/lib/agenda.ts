import "server-only";
import { fetchWithTimeout } from "@/lib/ai/providers/http";
import { getStoredCredential } from "@/lib/credentials-store";

/**
 * ATELIER — Agenda from an ICS calendar feed (server-only).
 *
 * The most portable way to read a calendar without OAuth: a public/secret ICS
 * feed URL (Google, Outlook and Apple all publish one). The URL is configured
 * from /ecosystem and stored (encrypted at rest) in `connector_credentials`
 * (connector_id `ics-calendar`, env_key `ICS_CALENDAR_URL`). It is read back
 * directly via the service-role client, falling back to the `ICS_CALENDAR_URL`
 * env var. Either way the secret stays server-side and the fetch happens here.
 *
 * The parser is a focused subset of RFC 5545: VEVENT blocks, DTSTART/DTEND,
 * SUMMARY/LOCATION, all-day vs timed, and enough RRULE (DAILY/WEEKLY/MONTHLY/
 * YEARLY with INTERVAL, BYDAY, BYMONTHDAY, UNTIL) plus EXDATE to surface the
 * recurring meetings that fall on *today*. Timezone handling is pragmatic:
 * instants in UTC (…Z) are converted to the display timezone; floating/TZID
 * times are read as wall-clock in that timezone. Good enough for a personal
 * agenda; documented as such.
 */

export interface AgendaEvent {
  id: string;
  title: string;
  timeLabel: string;
  location?: string;
  allDay: boolean;
  /** Pseudo-ms used only for same-day ordering. */
  sortKey: number;
}

export interface Agenda {
  connected: boolean;
  events: AgendaEvent[];
  error?: string;
}

const WEEKDAYS: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function displayTz(): string {
  return process.env.ATELIER_TIMEZONE || "Europe/Lisbon";
}

/** YYYY-MM-DD for an instant, in the display timezone. */
function dayInTz(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: displayTz(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** HH:MM for an instant, in the display timezone. */
function timeInTz(d: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: displayTz(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/* ── ICS parsing ──────────────────────────────────────────────────────────── */

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Unfold RFC 5545 line folding (continuation lines start with space/tab). */
function unfold(text: string): string[] {
  const raw = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = left.split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

interface ParsedDate {
  y: number;
  m: number; // 1-12
  d: number;
  /** time-of-day when not all-day */
  hh: number;
  mm: number;
  allDay: boolean;
  utc: boolean;
}

function parseDt(p: Prop): ParsedDate | null {
  const v = p.value.trim();
  const allDay = p.params.VALUE === "DATE" || /^\d{8}$/.test(v);
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  return {
    y: Number(m[1]),
    m: Number(m[2]),
    d: Number(m[3]),
    hh: m[4] ? Number(m[4]) : 0,
    mm: m[5] ? Number(m[5]) : 0,
    allDay,
    utc: m[7] === "Z",
  };
}

/** The local calendar day (YYYY-MM-DD) and time label this start lands on. */
function localDayAndTime(dt: ParsedDate): { day: string; time: string } {
  if (dt.allDay) {
    return {
      day: `${dt.y}-${String(dt.m).padStart(2, "0")}-${String(dt.d).padStart(2, "0")}`,
      time: "Todo o dia",
    };
  }
  if (dt.utc) {
    const inst = new Date(Date.UTC(dt.y, dt.m - 1, dt.d, dt.hh, dt.mm));
    return { day: dayInTz(inst), time: timeInTz(inst) };
  }
  // Floating / TZID: read wall-clock as the display timezone.
  return {
    day: `${dt.y}-${String(dt.m).padStart(2, "0")}-${String(dt.d).padStart(2, "0")}`,
    time: `${String(dt.hh).padStart(2, "0")}:${String(dt.mm).padStart(2, "0")}`,
  };
}

/** A stable UTC-noon Date for a Y-M-D, used for whole-day arithmetic. */
function noon(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d, 12);
}

function parseRRule(v: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of v.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

/** Does an RRULE event recur on `today` (both given as Y-M-D components)? */
function recursOn(
  rule: Record<string, string>,
  start: ParsedDate,
  today: { y: number; m: number; d: number }
): boolean {
  const startMs = noon(start.y, start.m, start.d);
  const todayMs = noon(today.y, today.m, today.d);
  if (todayMs < startMs) return false;

  if (rule.UNTIL) {
    const u = rule.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/);
    if (u && todayMs > noon(Number(u[1]), Number(u[2]), Number(u[3]))) {
      return false;
    }
  }

  const interval = Math.max(1, Number(rule.INTERVAL || "1"));
  const dayMs = 86400000;
  const diffDays = Math.round((todayMs - startMs) / dayMs);
  const todayDow = new Date(todayMs).getUTCDay();

  switch ((rule.FREQ || "").toUpperCase()) {
    case "DAILY":
      return diffDays % interval === 0;
    case "WEEKLY": {
      const byday = rule.BYDAY
        ? rule.BYDAY.split(",").map((d) => WEEKDAYS[d.slice(-2).toUpperCase()])
        : [new Date(startMs).getUTCDay()];
      if (!byday.includes(todayDow)) return false;
      const weeks = Math.floor(diffDays / 7);
      return weeks % interval === 0;
    }
    case "MONTHLY": {
      const monthday = rule.BYMONTHDAY ? Number(rule.BYMONTHDAY) : start.d;
      if (today.d !== monthday) return false;
      const months = (today.y - start.y) * 12 + (today.m - start.m);
      return months >= 0 && months % interval === 0;
    }
    case "YEARLY":
      return (
        today.m === start.m &&
        today.d === start.d &&
        (today.y - start.y) % interval === 0
      );
    default:
      return false;
  }
}

/** Parse the feed and return events that fall on today (display timezone). */
function eventsForToday(text: string): AgendaEvent[] {
  const lines = unfold(text);
  const todayStr = dayInTz(new Date());
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = { y: ty, m: tm, d: td };

  const events: AgendaEvent[] = [];
  let cur: Prop[] | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = [];
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(...buildIfToday(cur, todayStr, today));
      cur = null;
      continue;
    }
    if (cur) {
      const p = parseProp(line);
      if (p) cur.push(p);
    }
  }

  return events.sort((a, b) => a.sortKey - b.sortKey);
}

function buildIfToday(
  props: Prop[],
  todayStr: string,
  today: { y: number; m: number; d: number }
): AgendaEvent[] {
  const get = (n: string) => props.find((p) => p.name === n);
  const dtstart = get("DTSTART");
  if (!dtstart) return [];
  const start = parseDt(dtstart);
  if (!start) return [];

  // EXDATE: skip if today is explicitly excluded.
  const exdates = props
    .filter((p) => p.name === "EXDATE")
    .flatMap((p) => p.value.split(","))
    .map((v) => v.match(/^(\d{4})(\d{2})(\d{2})/))
    .filter(Boolean)
    .map((m) => `${m![1]}-${m![2]}-${m![3]}`);
  if (exdates.includes(todayStr)) return [];

  const rrule = get("RRULE");
  const { day, time } = localDayAndTime(start);

  const onToday = rrule
    ? recursOn(parseRRule(rrule.value), start, today)
    : day === todayStr;
  if (!onToday) return [];

  const summary = get("SUMMARY");
  const location = get("LOCATION");
  const uid = get("UID");

  return [
    {
      id: uid?.value || `${day}-${time}-${summary?.value ?? ""}`,
      title: summary ? unescapeText(summary.value) : "(sem título)",
      timeLabel: time,
      location: location ? unescapeText(location.value) : undefined,
      allDay: start.allDay,
      sortKey: start.allDay ? -1 : start.hh * 60 + start.mm,
    },
  ];
}

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * The configured ICS feed URL — from the connector credential store first
 * (set via /ecosystem), then the env var for compatibility.
 */
async function getIcsUrl(): Promise<string | undefined> {
  const stored = await getStoredCredential("ics-calendar", "ICS_CALENDAR_URL");
  return stored ?? process.env.ICS_CALENDAR_URL ?? undefined;
}

/** Today's agenda from the configured ICS feed. Degrades to empty/connected. */
export async function getAgenda(): Promise<Agenda> {
  const url = await getIcsUrl();
  if (!url) return { connected: false, events: [] };

  try {
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (!res.ok) {
      return { connected: true, events: [], error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    return { connected: true, events: eventsForToday(text) };
  } catch {
    return { connected: true, events: [], error: "Feed inacessível." };
  }
}

/** Lightweight check used by the connector "test connection". */
export async function probeAgenda(): Promise<{
  ok: boolean;
  message: string;
}> {
  const url = await getIcsUrl();
  if (!url) return { ok: false, message: "ICS_CALENDAR_URL em falta." };
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "text/calendar, text/plain, */*" },
  });
  if (!res.ok) return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    return { ok: false, message: "A resposta não parece um feed ICS." };
  }
  const total = (text.match(/BEGIN:VEVENT/gi) ?? []).length;
  const today = eventsForToday(text).length;
  return {
    ok: true,
    message: `Feed válido — ${total} eventos, ${today} hoje.`,
  };
}
