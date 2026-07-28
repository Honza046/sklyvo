/** Normalizace jmen autorů z outreach Sheetu / Notion / e-mailu. */
export function normalizeLeadAuthor(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s === "-") return null;

  const key = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // E-mail local-part (jan@venegard.com → jan)
  const local = key.includes("@") ? key.split("@")[0]! : key;

  if (
    local === "honza" ||
    local === "jan" ||
    key.includes("sedlar") ||
    key === "jan sedlar" ||
    key.startsWith("jan s")
  ) {
    return "Jan Sedlář";
  }
  if (
    local === "matej" ||
    local === "matěj" ||
    key.includes("pazdera") ||
    key.includes("matej")
  ) {
    return "Matěj Pazdera";
  }
  if (
    local === "filip" ||
    key.includes("retzl") ||
    key === "filip retzl" ||
    key.startsWith("filip r")
  ) {
    return "Filip Retzl";
  }

  return s.includes("@") ? null : s;
}
