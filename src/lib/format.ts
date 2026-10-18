// ============================================================
// format.ts  -  small functions that turn raw values into text for the screen
// ============================================================

// Changes a 24 hour time into a 12 hour time.   "14:30" -> "02:30 PM"
export function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// The database has no photo column yet, so this makes a small blue picture with the
// person's initials.   "Ali Khan" -> a blue circle with "AK"
export function avatarFor(name: string): string {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='#2563eb'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='46' font-weight='700' fill='white'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Shows an amount as money.   1540 -> "Rs. 1,540"
export function money(n: number): string {
  return `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

// Shows how long ago something happened.   "Just now", "5m ago", "3h ago", "2d ago"
export function timeAgoFrom(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
