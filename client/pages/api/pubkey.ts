// pages/api/pubkey.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync } from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const keyPath = path.join(process.cwd(), "keys", "public.pem");
    const pub = readFileSync(keyPath, "utf8");
    // trả raw PEM cho client
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(pub);
  } catch (e) {
    console.error("pubkey error", e);
    res.status(500).json({ error: "no public key" });
  }
}
