// ============================================================
// check-schema-drift.mjs
// Kiểm tra các Mongoose model dùng chung giữa server/webapi/cdn
// có bị lệch nhau (schema drift) hay không.
//
// Cách dùng:  node check-schema-drift.mjs
// Exit code: 0 = đồng bộ, 1 = có lệch (dùng được trong CI/pre-commit)
// ============================================================
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

// Các project chia sẻ model. cdn KHÔNG có User/Playlist (chủ đích).
const PROJECTS = ["server", "webapi", "cdn"];
const MODEL_DIR = join("app", "model");

// Model dùng chung cho cả 3 project
const SHARED_MODELS = [
  "Movie",
  "Season",
  "Episode",
  "Actor",
  "Category",
  "Country",
  "Studio",
];

// Model chỉ có ở server + webapi (cdn không cần)
const BACKEND_ONLY_MODELS = ["User", "Playlist"];

// Chuẩn hoá nội dung trước khi hash: bỏ comment + whitespace thừa
// để chỉ so sánh phần schema thực sự, không báo nhầm vì khác comment.
function normalize(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comment
    .replace(/\/\/.*$/gm, "")            // line comment
    .replace(/\s+/g, " ")                // gộp whitespace
    .trim();
}

function hashFile(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  return createHash("md5").update(normalize(raw)).digest("hex");
}

function pathFor(project, model) {
  return join(ROOT, project, MODEL_DIR, `${model}.ts`);
}

let hasDrift = false;
const lines = [];

function check(model, projects) {
  const hashes = projects.map((p) => ({ p, h: hashFile(pathFor(p, model)) }));
  const present = hashes.filter((x) => x.h !== null);
  const missing = hashes.filter((x) => x.h === null).map((x) => x.p);

  if (present.length === 0) {
    lines.push(`  ${model.padEnd(10)} : KHÔNG TÌM THẤY ở project nào`);
    hasDrift = true;
    return;
  }

  const ref = present[0].h;
  const allSame = present.every((x) => x.h === ref);

  if (allSame && missing.length === 0) {
    lines.push(`  ✅ ${model.padEnd(10)} : đồng bộ (${present.map((x) => x.p).join(", ")})`);
  } else if (allSame && missing.length > 0) {
    // Một số project chủ đích không có model này -> chỉ cảnh báo nhẹ
    lines.push(`  ✅ ${model.padEnd(10)} : đồng bộ ở [${present.map((x) => x.p).join(", ")}], thiếu ở [${missing.join(", ")}]`);
  } else {
    hasDrift = true;
    const detail = hashes
      .map((x) => `${x.p}=${x.h ? x.h.slice(0, 8) : "MISSING"}`)
      .join(" ");
    lines.push(`  ❌ ${model.padEnd(10)} : LỆCH -> ${detail}`);
  }
}

console.log("== Kiểm tra schema drift giữa server/webapi/cdn ==\n");

console.log("[ Model dùng chung cả 3 project ]");
for (const m of SHARED_MODELS) check(m, PROJECTS);
lines.forEach((l) => console.log(l));

lines.length = 0;
console.log("\n[ Model chỉ backend (server + webapi) ]");
for (const m of BACKEND_ONLY_MODELS) check(m, ["server", "webapi"]);
lines.forEach((l) => console.log(l));

console.log(
  hasDrift
    ? "\n🔴 KẾT QUẢ: Phát hiện schema lệch nhau. Hãy đồng bộ trước khi commit."
    : "\n🟢 KẾT QUẢ: Tất cả model đồng bộ."
);

process.exit(hasDrift ? 1 : 0);
