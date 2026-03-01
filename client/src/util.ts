import { compress } from "lz4-wasm";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 2,
});

export function credits(amount: number) {
  return moneyFormatter.format(amount);
}

export function percentage(amount: number) {
  return percentageFormatter.format(amount);
}

export function decimal(amount: number) {
  return decimalFormatter.format(amount);
}

export function time(seconds: number) {
  const parts: string[] = [];
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    parts.push(`${days}d`);
    seconds %= 86400;
  }
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    parts.push(`${hrs}h`);
    seconds %= 3600;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    parts.push(`${mins}m`);
    seconds %= 60;
  }
  if (seconds > 0) {
    parts.push(`${Math.round(seconds)}s`);
  }
  return parts.join(" ");
}

const enc = new TextEncoder();
export async function asShareCode<T>(input: T) {
  const buffer = compress(enc.encode(JSON.stringify(input)));
  const base64url = await new Promise<string>((r) => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result as string);
    reader.readAsDataURL(new Blob([buffer as BlobPart]));
  });
  return base64url.slice(base64url.indexOf(",") + 1);
}
