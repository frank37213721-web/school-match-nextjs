/** Masks a person's name for privacy, e.g. 謝阿祥 → 謝Ｏ祥, 王明 → 王Ｏ. */
export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return `${trimmed[0]}Ｏ`;
  return `${trimmed[0]}${"Ｏ".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}
