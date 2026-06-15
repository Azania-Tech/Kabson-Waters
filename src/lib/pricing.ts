export type SaleKind = "retail" | "wholesale" | "refill";

export interface PriceableItem {
  price: number;
  retailPrice?: number;
  wholesalePrice?: number;
  refillPrice?: number;
}

export function getRetailPrice(item: PriceableItem): number {
  return item.retailPrice ?? item.price;
}

export function getWholesalePrice(item: PriceableItem): number {
  return item.wholesalePrice ?? item.retailPrice ?? item.price;
}

export function getRefillPrice(item: PriceableItem): number {
  return item.refillPrice ?? Math.round(getWholesalePrice(item) * 0.5);
}

export function getPriceForSaleKind(item: PriceableItem, kind: SaleKind): number {
  switch (kind) {
    case "wholesale":
      return getWholesalePrice(item);
    case "refill":
      return getRefillPrice(item);
    default:
      return getRetailPrice(item);
  }
}

export function shouldSkipInventory(kind: SaleKind): boolean {
  return kind === "refill";
}

export function saleKindLabel(kind: SaleKind): string {
  switch (kind) {
    case "wholesale":
      return "Pack";
    case "refill":
      return "Refill";
    default:
      return "Retail";
  }
}

export function accountingCategoryForLine(kind: SaleKind, isCredit: boolean): string {
  if (kind === "refill") return "Refill Service";
  if (isCredit || kind === "wholesale") return "Wholesale";
  return "Retail Sales";
}

export function lineDisplayName(name: string, kind?: SaleKind): string {
  if (kind === "refill") return `${name} (Refill)`;
  if (kind === "wholesale") return `${name} (Pack)`;
  return name;
}

/** Price used for production customer orders (e.g. 1L pack = KES 600). Falls back to wholesalePrice. */
export function getCustomerOrderPrice(item: PriceableItem & { customerOrderPrice?: number }): number {
  return item.customerOrderPrice ?? getWholesalePrice(item);
}

export function getPackSize(itemName: string): number {
  const name = itemName.toLowerCase();
  const packOfMatch = name.match(/pack\s+of\s+(\d+)/i);
  if (packOfMatch) return parseInt(packOfMatch[1], 10) || 1;
  if (name.includes("500ml")) return 24;
  if (name.includes("1l") && !name.includes("10l") && !name.includes("20l")) return 12;
  return 1;
}
