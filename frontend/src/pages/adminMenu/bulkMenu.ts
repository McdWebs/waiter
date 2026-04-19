export interface BulkCategory {
  categoryName: string;
  items: { name: string; price: number }[];
}

export function parseBulkMenuText(text: string): BulkCategory[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: BulkCategory[] = [];
  let current: BulkCategory | null = null;

  for (const line of lines) {
    const emIdx = line.indexOf("—");
    const enIdx = line.indexOf("–");
    const dashIdx = emIdx >= 0 ? emIdx : enIdx >= 0 ? enIdx : -1;

    if (dashIdx > 0) {
      const name = line.slice(0, dashIdx).trim();
      const afterDash = line.slice(dashIdx + 1).trim();
      const priceStr = afterDash.replace(/[₪$€£\s]/g, "").replace(",", ".");
      const price = parseFloat(priceStr);
      if (name && !Number.isNaN(price) && price > 0 && current) {
        current.items.push({ name, price });
        continue;
      }
    }

    if (line) {
      current = { categoryName: line, items: [] };
      result.push(current);
    }
  }

  return result.filter((c) => c.items.length > 0);
}
