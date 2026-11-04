// What #4471 really holds. Counts follow the desk's own view (causes.ts, as CauseTable shows it):
// every report is counted under the cause it is filed under. The one-day moves (desk-notes.json)
// stay counted where they are filed, and they also get a row of their own, because a one-day move
// is not a flipped date: it is its own problem with its own ticket.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

// Where each problem stands. Engineering closed #4471 on 5 October 2026.
export const PROBLEMS: Record<Problem, { title: string; issue: number | null; state: string; why: string }> = {
  parser: { title: 'Shared parser reads day-first dates month first', issue: 1, state: 'fixed', why: 'fix(dates): parse dd/mm for eu locales' },
  hint: { title: 'booking-v3 form hints MM/DD/YYYY to day-first tenants', issue: 2, state: "won't fix", why: 'booking-v3 form retired' },
  'one-day': { title: 'Invite lands one day off, by recipient time zone', issue: 3, state: 'open', why: 'not in the engineering update' },
  unplaced: { title: 'No tenant on file', issue: null, state: 'open', why: '' },
};

export function problemOf(r: Report, t: Tenant | undefined): Problem {
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[]; alsoFiled: number } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r));
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) by.set('one-day', moved);
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: tally(rs.map((r) => r.channel)),
        taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  const alsoFiled = merged.filter((r) => oneDayMove.includes(r.id)).length;
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups, alsoFiled };
}
