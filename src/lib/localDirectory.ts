export function cleanDirectorySearch(value: string | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function matchesDirectorySearch(searchTerm: string, values: Array<string | null | undefined>) {
  const terms = searchTerm
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) return true;

  const haystack = values
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return terms.every((term) => haystack.includes(term));
}
