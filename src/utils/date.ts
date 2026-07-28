/**
 * Utility functions for East 8th Zone (Asia/Shanghai, UTC+8) time formatting.
 */

/**
 * Formats a Date, timestamp (ms or sec), ISO string, or Epoch string into Shanghai Time (UTC+8).
 * Output format: "YYYY-MM-DD HH:mm" (or "YYYY-MM-DD HH:mm:ss" if withSeconds is true)
 */
export function formatShanghaiTime(
  dateInput?: Date | string | number | null,
  withSeconds = false
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return getShanghaiNowString(withSeconds);
  }

  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.startsWith('Epoch ')) {
      const secs = parseInt(trimmed.replace('Epoch ', ''), 10);
      date = isNaN(secs) ? new Date() : new Date(secs * 1000);
    } else if (/^\d{10}$/.test(trimmed)) {
      date = new Date(parseInt(trimmed, 10) * 1000);
    } else if (/^\d{13}$/.test(trimmed)) {
      date = new Date(parseInt(trimmed, 10));
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = new Date();
  }

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = p.value;
    }
  }

  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';

  const timeStr = withSeconds
    ? `${hour}:${partMap.minute}:${partMap.second || '00'}`
    : `${hour}:${partMap.minute}`;

  return `${partMap.year}-${partMap.month}-${partMap.day} ${timeStr}`;
}

/**
 * Returns current timestamp string formatted in East 8th Zone (Asia/Shanghai) time: "YYYY-MM-DD HH:mm"
 */
export function getShanghaiNowString(withSeconds = false): string {
  return formatShanghaiTime(new Date(), withSeconds);
}
