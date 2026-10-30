const price = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});
const count = new Intl.NumberFormat("en-CA");

export function formatPrice(cad: number): string {
  return price.format(cad);
}

export function formatNumber(n: number): string {
  return count.format(n);
}

export function slideCounter(index: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(index + 1)}/${pad(total)}`;
}
