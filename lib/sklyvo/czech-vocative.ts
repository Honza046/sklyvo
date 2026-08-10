/**
 * Czech vocative (5. pád) for first names — “Vítejte zpět, Jane / Matěji / Pavle…”.
 * Heuristic + common exceptions; unknown names fall back to a safe rule.
 */

const EXCEPTIONS: Record<string, string> = {
 // irregular / frequent
 petr: "Petře",
 peter: "Petere",
 jiri: "Jiří",
 "jiří": "Jiří",
 ondrej: "Ondřeji",
 "ondřej": "Ondřeji",
 ondra: "Ondro",
 honza: "Honzo",
 pepa: "Pepo",
 jirka: "Jirko",
 mirek: "Mirku",
 zdenda: "Zdeno",
 kuba: "Kubo",
 // already-vocative diminutives stay
 jane: "Jane",
 mateji: "Matěji",
 "matěji": "Matěji",
 pavle: "Pavle",
 ondro: "Ondro",
};

function foldKey(name: string): string {
 return name
 .trim()
 .toLowerCase()
 .normalize("NFD")
 .replace(/\p{M}/gu, "");
}

function capitalizeLike(source: string, vocative: string): string {
 if (!source || !vocative) return vocative;
 if (source === source.toUpperCase()) return vocative.toUpperCase();
 if (source[0] === source[0].toUpperCase()) {
 return vocative.charAt(0).toUpperCase() + vocative.slice(1);
 }
 return vocative;
}

/** Soft consonants that take -i in the vocative. */
const SOFT_ENDING = /[šžčřcjďťň]$/i;

/** Names ending in -el → -le (Pavel→Pavle, Karel→Karle). */
const EL_TO_LE = /^(pavel|karel)$/i;

/**
 * Convert a Czech first name to vocative. Non-Czech / empty → unchanged.
 */
export function toCzechVocative(rawName: string): string {
 const name = rawName.trim();
 if (!name) return rawName;

 const key = foldKey(name);
 const exception = EXCEPTIONS[key] ?? EXCEPTIONS[name.toLowerCase()];
 if (exception) return capitalizeLike(name, exception);

 const lower = name.toLowerCase();

 // -a / -á → -o (Jana→Jano, Eva→Evo, Honza→Honzo, Eliška→Eliško)
 if (/[aá]$/i.test(name)) {
 return capitalizeLike(name, name.slice(0, -1) + "o");
 }

 // -ie / -e feminine-ish stay (Marie, Lucie, Natálie, Amálie)
 if (/ie$/i.test(name) || /[eé]$/i.test(name)) {
 return name;
 }

 // -í stay (Jiří already in exceptions)
 if (/[íý]$/i.test(name)) {
 return name;
 }

 // -ek / -ěk → -ku / -ěku (Marek→Marku, Radek→Radku)
 if (/[eě]k$/i.test(name)) {
 return capitalizeLike(name, name.slice(0, -2) + "ku");
 }

 // Pavel / Karel → Pavle / Karle
 if (EL_TO_LE.test(lower)) {
 return capitalizeLike(name, name.slice(0, -2) + "le");
 }
 // other -el → -eli (Daniel→Danieli)
 if (/el$/i.test(name)) {
 return capitalizeLike(name, name + "i");
 }

 // Michal → Michale (hard +e)
 if (/^michal$/i.test(lower)) {
 return capitalizeLike(name, name + "e");
 }

 // soft → +i (Matěj→Matěji, Tomáš→Tomáši, Lukáš→Lukáši)
 if (SOFT_ENDING.test(name)) {
 return capitalizeLike(name, name + "i");
 }

 // -k / -g / -h / -ch → -u (Dominik→Dominiku, Patrik→Patriku)
 if (/ch$/i.test(name)) {
 return capitalizeLike(name, name + "u");
 }
 if (/[kgh]$/i.test(name)) {
 return capitalizeLike(name, name + "u");
 }

 // default hard consonant → +e (Jan→Jane, Adam→Adame, David→Davide, Filip→Filipe)
 if (/[bcdfghjklmnpqrstvwxz]$/i.test(name)) {
 return capitalizeLike(name, name + "e");
 }

 return name;
}
