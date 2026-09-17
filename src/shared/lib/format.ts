const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});
const pence = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

/** £45, £12.50 */
export function formatMoney(amount: number) {
  return (Number.isInteger(amount) ? pounds : pence).format(amount);
}

/** Parse what someone typed into a price field: "£45.50", "45,50" and "45" all work. */
export function parseMoney(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}
