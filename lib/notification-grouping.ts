/**
 * groupByRecency — regroupe une liste triée (plus récent en premier) en
 * seaux "Aujourd'hui" / "Cette semaine" / "Plus ancien", pour l'affichage
 * du NotificationPanel.
 *
 * - "Aujourd'hui" : même jour calendaire que `now`.
 * - "Cette semaine" : les 6 jours calendaires précédents.
 * - "Plus ancien" : le reste.
 *
 * Un seau vide n'apparaît pas dans le résultat. L'ordre des éléments à
 * l'intérieur d'un seau est préservé (stable).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecencyGroup<T> {
  label: string;
  items: T[];
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function groupByRecency<T extends { created_at: string }>(
  items: T[],
  now: Date = new Date()
): RecencyGroup<T>[] {
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * DAY_MS;

  const today: T[] = [];
  const week: T[] = [];
  const older: T[] = [];

  for (const item of items) {
    const t = new Date(item.created_at).getTime();
    if (t >= todayStart) today.push(item);
    else if (t >= weekStart) week.push(item);
    else older.push(item);
  }

  const groups: RecencyGroup<T>[] = [];
  if (today.length) groups.push({ label: "Aujourd'hui", items: today });
  if (week.length) groups.push({ label: "Cette semaine", items: week });
  if (older.length) groups.push({ label: "Plus ancien", items: older });
  return groups;
}
