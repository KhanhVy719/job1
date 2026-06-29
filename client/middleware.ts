import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const isCocCoc =
    ua.includes("coc_coc_browser") ||
    ua.includes("CocCoc") ||
    ua.includes("coc_coc_browser/");

  const isHeadless =
    ua.includes("Headless") ||
    ua.includes("PhantomJS") ||
    /bot|crawl|spider/i.test(ua);

  const ip =
    (req as any).ip ||
    req.headers.get("x-forwarded-for") ||
    "unknown";

  const serverDeviceInfo = {
    os: result.os,
    browser: result.browser,
    device: result.device,
    engine: result.engine,
    isCocCoc,
    isHeadless,
    ip,
  };

  const res = NextResponse.next();
  res.headers.set(
    "x-device-info",
    Buffer.from(JSON.stringify(serverDeviceInfo)).toString("base64")
  );

  return res;
}
