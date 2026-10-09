import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const FILE = process.env.USAGE_FILE || path.resolve("usage-data.json");

// Per-key limits (OpenRouter free tier: 20/min, 50/day)
export const LIMIT_PER_MINUTE = Number(process.env.OPENROUTER_RPM || 20);
export const LIMIT_PER_DAY = Number(process.env.OPENROUTER_RPD || 50);

const MINUTE_MS = 60_000;

// keyId -> list of request timestamps (ms)
type Store = Record<string, number[]>;

let store: Store = {};
try {
  store = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  store = {};
}

// Never store raw API keys; use a short hash as the id
export function keyId(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 8);
}

function startOfUtcDay(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function prune(now = Date.now()) {
  const cutoff = now - 25 * 60 * 60 * 1000;
  for (const id of Object.keys(store)) {
    store[id] = store[id].filter((t) => t >= cutoff);
  }
}

function save() {
  try {
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, FILE); // atomic replace
  } catch (err) {
    console.error("[Usage] Failed to save usage file:", err);
  }
}

export function recordRequest(id: string) {
  const now = Date.now();
  prune(now);
  (store[id] ||= []).push(now);
  save();
}

export type KeyUsage = {
  usedMinute: number;
  usedDay: number;
  remainingMinute: number;
  remainingDay: number;
  available: number; // how many requests you can still send right now
  minuteResetsInSec: number;
  dayResetsInSec: number;
};

export function getKeyUsage(id: string): KeyUsage {
  const now = Date.now();
  const stamps = store[id] || [];
  const dayStart = startOfUtcDay(now);

  const inMinute = stamps.filter((t) => t > now - MINUTE_MS);
  const inDay = stamps.filter((t) => t >= dayStart);

  const remainingMinute = Math.max(0, LIMIT_PER_MINUTE - inMinute.length);
  const remainingDay = Math.max(0, LIMIT_PER_DAY - inDay.length);

  return {
    usedMinute: inMinute.length,
    usedDay: inDay.length,
    remainingMinute,
    remainingDay,
    available: Math.min(remainingMinute, remainingDay),
    minuteResetsInSec: inMinute.length
      ? Math.ceil((inMinute[0] + MINUTE_MS - now) / 1000)
      : 0,
    dayResetsInSec: Math.ceil((dayStart + 24 * 60 * 60 * 1000 - now) / 1000),
  };
}

export function getSummary(keys: string[]) {
  const perKey = keys.map((k, i) => ({
    key: `OpenRouter key ${i + 1}`,
    id: keyId(k),
    limits: { perMinute: LIMIT_PER_MINUTE, perDay: LIMIT_PER_DAY },
    ...getKeyUsage(keyId(k)),
  }));

  return {
    keyCount: keys.length,
    totalLimits: {
      perMinute: LIMIT_PER_MINUTE * keys.length,
      perDay: LIMIT_PER_DAY * keys.length,
    },
    totalUsedMinute: perKey.reduce((s, k) => s + k.usedMinute, 0),
    totalUsedDay: perKey.reduce((s, k) => s + k.usedDay, 0),
    totalRemainingMinute: perKey.reduce((s, k) => s + k.remainingMinute, 0),
    totalRemainingDay: perKey.reduce((s, k) => s + k.remainingDay, 0),
    keys: perKey,
  };
}