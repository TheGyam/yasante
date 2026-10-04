/** The last records opened in this tab, for the command palette. */

export interface RecentRecord {
  name: string;
  url: string;
  group: string;
}

const KEY = 'staff.recent';

export function recentRecords(): RecentRecord[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as RecentRecord[];
  } catch {
    return [];
  }
}

export function rememberRecord(record: RecentRecord) {
  try {
    const next = [record, ...recentRecords().filter(item => item.url !== record.url)].slice(0, 8);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be refused; the palette just shows no recents.
  }
}
