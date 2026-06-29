import { checkFixedWindowRateLimit } from "./utils/redisRateLimit";

async function main() {
  let lastAllowedCount = 0;
  let firstBlocked = -1;
  for (let i = 1; i <= 12; i++) {
    const r = await checkFixedWindowRateLimit({ scope: "test", identity: "ip-1.2.3.4", max: 10, windowSeconds: 2 });
    if (r.allowed) lastAllowedCount = r.count;
    else if (firstBlocked < 0) firstBlocked = r.count;
  }
  console.log("ALLOWED_UP_TO", lastAllowedCount, "FIRST_BLOCKED_AT", firstBlocked);

  const other = await checkFixedWindowRateLimit({ scope: "test", identity: "ip-9.9.9.9", max: 10, windowSeconds: 2 });
  console.log("OTHER_IDENTITY_COUNT", other.count, "ALLOWED", other.allowed);
  console.log("RESET_IN", other.resetInSeconds >= 0 ? "OK" : "BAD", other.resetInSeconds);
  process.exit(0);
}
main().catch((e) => { console.error("CRASH", e?.name); process.exit(1); });
