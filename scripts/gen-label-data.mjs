/**
 * Generate hand-label-data.json for the labelling UI.
 * Deduplicated union of baselineTop5 (marketplace order) + top5 (fused)
 * across all photo queries. Arm identity is NOT included (blind labelling).
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Find latest eval2 report
const reports = readdirSync(join(root, 'eval2'))
  .filter((f) => f.startsWith('eval2-report-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (reports.length === 0) {
  console.error('No eval2 report found');
  process.exit(1);
}

const reportPath = join(root, 'eval2', reports[0]);
console.log('Using report:', reports[0]);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

const queries = [];
const seenUrls = new Set(); // global dedup not needed, per-query dedup

for (const q of report.queries) {
  if (q.kind !== 'photo') continue;

  // Deduplicated union of both arms' top-5
  const itemsByUrl = new Map();
  for (const item of [...(q.baselineTop5 || []), ...(q.top5 || [])]) {
    if (!itemsByUrl.has(item.url)) {
      itemsByUrl.set(item.url, {
        title: item.title,
        priceText: item.priceText,
        url: item.url,
        image: item.image,
      });
    }
  }

  // Query photo path — eval2 photos are in eval2/photos/
  const photoFile = q.file;
  queries.push({
    file: photoFile,
    photo: `/eval-photos/${photoFile}`,
    items: [...itemsByUrl.values()],
  });
}

const out = { queries, generatedAt: new Date().toISOString(), sourceReport: reports[0] };
writeFileSync(join(root, 'public', 'hand-label-data.json'), JSON.stringify(out, null, 2));

const totalItems = queries.reduce((s, q) => s + q.items.length, 0);
console.log(`Queries: ${queries.length}, total unique items: ${totalItems}`);
console.log(`Avg items per query: ${(totalItems / queries.length).toFixed(1)}`);
console.log('Written to public/hand-label-data.json');
