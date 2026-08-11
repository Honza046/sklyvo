/** Canonical CZ service strings stay stored; UI labels come from i18n. */

type Translate = (path: string) => string;

export function tServiceGroup(t: Translate, groupId: string): string {
  const path = `catalog.serviceGroups.${groupId}`;
  const out = t(path);
  return out === path ? groupId : out;
}

export function tService(t: Translate, canonical: string): string {
  const path = `catalog.services.${canonical}`;
  const out = t(path);
  return out === path ? canonical : out;
}
