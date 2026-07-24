/** Normalizace jmen autorů z outreach Sheetu / Notion. */
export function normalizeLeadAuthor(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s === "-") return null;

  const key = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    key === "honza" ||
    key.includes("sedlar") ||
    key === "jan sedlar" ||
    key.startsWith("jan s")
  ) {
    return "Jan Sedlář";
  }
  if (key.includes("pazdera") || key.includes("matej")) {
    return "Matěj Pazdera";
  }
  if (key.includes("retzl") || key === "filip retzl" || key.startsWith("filip r")) {
    return "Filip Retzl";
  }

  return s;
}
