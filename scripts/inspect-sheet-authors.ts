import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "../lib/prisma";
import {
  fetchSpreadsheetValues,
  getGoogleSheetsAccessToken,
} from "../lib/google-sheets-sync";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      if (q && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (ch === "," && !q) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !q) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

async function main() {
  const ws = "cmp4j5md9000bfgngy5sb3otz";
  const token = await getGoogleSheetsAccessToken(ws);
  if (!token) throw new Error("no token");
  const id = "1KAoCo7_HHpleIs5eAKVhlsQLQuIkke-dAg-dQsYE7xs";

  const meta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).then((r) => r.json());
  console.log(
    "tabs:",
    (meta.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title),
  );

  for (const name of ["Radar", "Sniper", "Master", "Sheet1"]) {
    try {
      const all = await fetchSpreadsheetValues({
        accessToken: token,
        spreadsheetId: id,
        range: `'${name}'!A1:J`,
      });
      const header = (all[0] || []).map((h: string) => h.trim().toLowerCase());
      const ai = header.findIndex((h: string) => h === "autor" || h === "author");
      console.log(`\n=== ${name} ===`);
      console.log("header:", header);
      console.log("sample:", all.slice(0, 4));
      if (ai < 0) continue;
      const counts = new Map<string, number>();
      for (const row of all.slice(1)) {
        const a = (row[ai] || "").trim() || "(empty)";
        counts.set(a, (counts.get(a) || 0) + 1);
      }
      console.log(
        "autor counts:",
        Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)),
      );
    } catch (e) {
      console.log(name, "ERR", e instanceof Error ? e.message : e);
    }
  }

  const bad = await prisma.lead.updateMany({
    where: { workspaceId: ws, author: { contains: "http" } },
    data: { author: null },
  });
  const bez = await prisma.lead.updateMany({
    where: { workspaceId: ws, OR: [{ author: "bez webu" }, { author: "Sklyvo" }] },
    data: { author: null },
  });
  console.log("\ncleared bad/placeholder authors", { urls: bad.count, other: bez.count });

  const text = readFileSync(
    "/Users/honza/outreachagent_V2/tmp/notion-export/part1/file_1.csv",
    "utf8",
  );
  const nrows = parseCsv(text.replace(/^\uFEFF/, ""));
  const h = (nrows[0] || []).map((x) => x.trim());
  console.log("\nnotion header", h);
  const iAuth = h.findIndex((x) => /vytvo/i.test(x));
  const counts = new Map<string, number>();
  for (const r of nrows.slice(1)) {
    const a = (r[iAuth] || "").trim() || "(empty)";
    counts.set(a, (counts.get(a) || 0) + 1);
  }
  console.log("notion Vytvořil:", Object.fromEntries(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
