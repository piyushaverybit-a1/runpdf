import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const FILE = process.env.USAGE_FILE || path.resolve("usage-data.json");

export const LIMIT_PER_MINUTE = Number(process.env.OPENROUTER_RPM || 20);
export const LIMIT_PER_DAY = Number(process.env.OPENROUTER_RPD || 50);

const MINUTE_MS = 60_000;

type Store = Record<string, number[]>;

let store: Store = {};
try {
  store = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  store = {};
}

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

// Aaj ka count `count` ke barabar kar deta hai (purani requests ke liye)
export function seedUsage(id: string, count: number) {
  const now = Date.now();
  const dayStart = startOfUtcDay(now);
  const current = (store[id] || []).filter((t) => t >= dayStart).length;
  const missing = Math.max(0, count - current);

  // UTC din ki shuruaat par rakhe jate hain, isliye per-minute window par asar nahi
  const placeholders = Array.from({ length: missing }, () => dayStart);
  store[id] = [...placeholders, ...(store[id] || [])];
  save();
}

export type KeyUsage = {
  usedMinute: number;
  usedDay: number;
  remainingMinute: number;
  remainingDay: number;
  available: number; // abhi kitni requests bhej sakte ho
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
      ? Math.ceil((Math.min(...inMinute) + MINUTE_MS - now) / 1000)
      : 0,
    dayResetsInSec: Math.ceil((dayStart + 24 * 60 * 60 * 1000 - now) / 1000),
  };
}

export function getSummary(apiKeys: string[]) {
  const usageByKey = apiKeys.map((apiKey, index) => {
    const hashedKeyId = keyId(apiKey);

    return {
      key: `OpenRouter key ${index + 1}`,
      id: hashedKeyId,
      limits: { perMinute: LIMIT_PER_MINUTE, perDay: LIMIT_PER_DAY },
      ...getKeyUsage(hashedKeyId),
    };
  });

  return {
    keyCount: apiKeys.length,
    totalLimits: {
      perMinute: LIMIT_PER_MINUTE * apiKeys.length,
      perDay: LIMIT_PER_DAY * apiKeys.length,
    },
    totalUsedMinute: usageByKey.reduce(
      (total, keyUsage) => total + keyUsage.usedMinute,
      0,
    ),
    totalUsedDay: usageByKey.reduce(
      (total, keyUsage) => total + keyUsage.usedDay,
      0,
    ),
    totalRemainingMinute: usageByKey.reduce(
      (total, keyUsage) => total + keyUsage.remainingMinute,
      0,
    ),
    totalRemainingDay: usageByKey.reduce(
      (total, keyUsage) => total + keyUsage.remainingDay,
      0,
    ),
    keys: usageByKey,
  };
}
