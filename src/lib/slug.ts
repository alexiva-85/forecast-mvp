const translitMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

export function slugifyTitle(title: string): string {
  const lower = title.toLowerCase().trim();
  let result = "";

  for (const char of lower) {
    if (translitMap[char]) {
      result += translitMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      result += char;
    } else if (/\s|[-_./,]/.test(char)) {
      result += "-";
    }
  }

  return result
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
