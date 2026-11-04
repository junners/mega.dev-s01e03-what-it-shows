<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEMS, splitTicket } from '#lib/kb/split';

  let { ticket, repo }: { ticket: number; repo: string } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports in #{ticket}
  ({split.rows} rows in the export; {split.rows - split.merged.length} came twice) ·
  <strong>{split.groups.length}</strong> {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>ticket</th><th>state</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      {@const p = PROBLEMS[g.problem]}
      <tr>
        <td>{p.title}</td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{g.tenants.length}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if p.issue}<a href="https://github.com/{repo}/issues/{p.issue}">#{p.issue}</a>{:else}none{/if}</td>
        <td title={p.why}><span class="state">{p.state}</span>{#if p.why}<br /><span class="small">{p.why}</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if split.alsoFiled}
  <p class="small">The {split.alsoFiled} one-day moves are counted where the desk filed them, under <code>parser</code> by tenant, and again in their own row. That is why the rows add up to more than {split.merged.length}.</p>
{/if}

{#each split.groups.filter((g) => g.tenants.length <= 5) as g (g.problem)}
  <p class="small"><code>{g.problem}</code> tenants: {g.tenants.join(', ')} · reports: {g.reports.length <= 5 ? g.reports.map((r) => r.id).join(', ') : `${g.reports.length}`}</p>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .state { font-weight: 600; }
</style>
