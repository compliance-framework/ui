/** Minutes as "45m", "2h" or "2h 5m"; nothing recorded reads "Not recorded". */
export function formatDuration(minutes?: number): string {
  if (!minutes) return 'Not recorded';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
