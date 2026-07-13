export const CHROME_URL =
  "https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib";

export const GITHUB_URL =
  "https://github.com/DennisLypovetsky/polymarket-apr";

export const examples = [
  { id: "near", price: 97.4, days: 17, apr: 57 },
  { id: "far", price: 97.4, days: 31, apr: 31 },
  { id: "defi", price: 96.3, days: 83, apr: 17 },
] as const;

export function estimatedApr(price: number, days: number): number {
  const roi = ((100 - price) / price) * 100;
  return (roi / days) * 365;
}
