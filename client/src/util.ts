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

export function credits(amount: number) {
  return moneyFormatter.format(amount);
}

export function percentage(amount: number) {
  return percentageFormatter.format(amount);
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
