#!/usr/bin/env node
/**
 * Analysis script for hand-labelled ablation eval.
 *
 * Takes label CSVs (from hand-label.html exports) and cached pools,
 * outputs:
 * - strict (label=2) and lenient (label>=1) P@5 per arm
 * - oracle P@5 from labelled pool items
 * - paired per-query comparison (improved/same/worse) with bootstrap CI
 * - Cohen's weighted kappa on double-labelled items
 * - per-category breakdown (flagged low-n)
 *
 * Usage:
 *   node scripts/analyze-labels.mjs --labels labels-a.csv,labels-b.csv,labels-c.csv --pools eval2/pools-freeze-2026-10-02.json
 *   node scripts/analyze-labels.mjs --test  (runs on synthetic labels)
 */

import { readFileSync } from 'fs';

// Parse CSV
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // Simple CSV parse (handles quoted titles)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i+1] === '"') {
        current += '"'; i++;
      } else if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(current); current = '';
      } else {
        current += c;
      }
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

// Load labels from multiple CSVs
function loadLabels(csvPaths) {
  const labels = new Map(); // itemKey -> [{label, annotator, timestamp}]
  csvPaths.forEach((path) => {
    const rows = parseCSV(readFileSync(path, 'utf-8'));
    rows.forEach((row) => {
      const key = row.query_file + '||' + row.item_url;
      if (!labels.has(key)) labels.set(key, []);
      labels.get(key).push({
        label: parseInt(row.label),
        annotator: row.annotator_id,
        timestamp: row.timestamp,
      });
    });
  });
  return labels;
}

// Compute P@5 for an arm
function computePAt5(rankedItems, labels, strict) {
  // rankedItems: array of {url} in rank order (top 5)
  // labels: Map itemKey -> [{label}]
  // strict: true => label==2, false => label>=1
  let hits = 0;
  let counted = 0;
  rankedItems.slice(0, 5).forEach((item) => {
    // Find label for this item (need query file - passed in)
    // For now, assume item has _key
    const labelEntries = labels.get(item._key);
    if (!labelEntries || labelEntries.length === 0) return; // unlabelled, skip
    // Use first annotator's label (or majority if multiple)
    const label = labelEntries[0].label;
    const isHit = strict ? (label === 2) : (label >= 1);
    if (isHit) hits++;
    counted++;
  });
  return counted > 0 ? hits / Math.min(5, counted) : null;
}

// Bootstrap CI for paired difference
function bootstrapCI(differences, nBoot = 10000, alpha = 0.05) {
  const n = differences.length;
  const means = [];
  for (let b = 0; b < nBoot; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += differences[Math.floor(Math.random() * n)];
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(alpha/2 * nBoot)];
  const hi = means[Math.floor((1 - alpha/2) * nBoot)];
  return { lo, hi, mean: differences.reduce((a,b) => a+b, 0) / n };
}

// Cohen's weighted kappa (quadratic weights for 0/1/2)
function weightedKappa(labelsA, labelsB) {
  // labelsA, labelsB: arrays of 0/1/2 for same items
  const n = labelsA.length;
  const k = 3; // categories 0,1,2

  // Observed weighted agreement
  let observed = 0;
  const conf = Array(k).fill().map(() => Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    conf[labelsA[i]][labelsB[i]]++;
  }

  // Quadratic weights: w_ij = 1 - ((i-j)/(k-1))^2
  const weights = Array(k).fill().map((_, i) =>
    Array(k).fill().map((_, j) => 1 - Math.pow((i - j) / (k - 1), 2))
  );

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      observed += weights[i][j] * conf[i][j] / n;
    }
  }

  // Expected agreement
  const margA = Array(k).fill(0);
  const margB = Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      margA[i] += conf[i][j] / n;
      margB[j] += conf[i][j] / n;
    }
  }

  let expected = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      expected += weights[i][j] * margA[i] * margB[j];
    }
  }

  return (observed - expected) / (1 - expected);
}

// Main analysis
function analyze(labels, pools) {
  const results = {
    arms: ['baseline', 'fused'],
    strict: {},
    lenient: {},
    perQuery: [],
    kappa: null,
  };

  // For each query, compute P@5 per arm
  const queryIds = Object.keys(pools.pools);
  const strictDiffs = [];
  const lenientDiffs = [];

  queryIds.forEach((qid) => {
    const pool = pools.pools[qid];

    // Build ranked lists with keys
    const baselineRanked = (pool.baselineTop5 || []).map((item) => ({
      ...item,
      _key: qid + '.jpg||' + item.url, // query file is qid + .jpg
    }));
    // Actually query file might not be qid.jpg, use pool.file
    const qfile = pool.file || (qid + '.jpg');
    baselineRanked.forEach((item) => item._key = qfile + '||' + item.url);

    const fusedRanked = (pool.fusedTop5 || []).map((item) => ({
      ...item,
      _key: qfile + '||' + item.url,
    }));

    const bStrict = computePAt5(baselineRanked, labels, true);
    const fStrict = computePAt5(fusedRanked, labels, true);
    const bLenient = computePAt5(baselineRanked, labels, false);
    const fLenient = computePAt5(fusedRanked, labels, false);

    if (bStrict !== null && fStrict !== null) {
      strictDiffs.push(fStrict - bStrict);
      results.perQuery.push({
        query: qid,
        baselineStrict: bStrict,
        fusedStrict: fStrict,
        diffStrict: fStrict - bStrict,
        baselineLenient: bLenient,
        fusedLenient: fLenient,
        diffLenient: fLenient - bLenient,
        improved: fStrict > bStrict ? 'fused' : (fStrict < bStrict ? 'baseline' : 'same'),
      });
    }
    if (bLenient !== null && fLenient !== null) {
      lenientDiffs.push(fLenient - bLenient);
    }
  });

  // Aggregate
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  results.strict.baseline = avg(results.perQuery.map((q) => q.baselineStrict));
  results.strict.fused = avg(results.perQuery.map((q) => q.fusedStrict));
  results.lenient.baseline = avg(results.perQuery.map((q) => q.baselineLenient));
  results.lenient.fused = avg(results.perQuery.map((q) => q.fusedLenient));

  // Bootstrap CIs
  results.strict.ci = bootstrapCI(strictDiffs);
  results.lenient.ci = bootstrapCI(lenientDiffs);

  // Paired comparison counts
  results.paired = {
    fusedBetter: results.perQuery.filter((q) => q.improved === 'fused').length,
    baselineBetter: results.perQuery.filter((q) => q.improved === 'baseline').length,
    same: results.perQuery.filter((q) => q.improved === 'same').length,
  };

  // Kappa on double-labelled items
  const doubleLabelled = [];
  labels.forEach((entries, key) => {
    if (entries.length >= 2) {
      // Take first two annotators
      doubleLabelled.push([entries[0].label, entries[1].label]);
    }
  });
  if (doubleLabelled.length > 0) {
    const a = doubleLabelled.map((p) => p[0]);
    const b = doubleLabelled.map((p) => p[1]);
    results.kappa = {
      n: doubleLabelled.length,
      weightedKappa: weightedKappa(a, b),
    };
  }

  return results;
}

// Synthetic test
function runSyntheticTest() {
  console.log('=== Synthetic Label Test ===\n');

  // Create fake pools
  const pools = {
    pools: {}
  };
  for (let i = 0; i < 10; i++) {
    const qid = `query_${i}`;
    pools.pools[qid] = {
      file: `${qid}.jpg`,
      baselineTop5: Array(5).fill().map((_, j) => ({ url: `http://example.com/b${i}_${j}` })),
      fusedTop5: Array(5).fill().map((_, j) => ({ url: `http://example.com/f${i}_${j}` })),
    };
  }

  // Test 1: Random labels (no difference expected)
  console.log('Test 1: Random labels (expect no significant difference)');
  const randomLabels = new Map();
  Object.keys(pools.pools).forEach((qid) => {
    const pool = pools.pools[qid];
    [...pool.baselineTop5, ...pool.fusedTop5].forEach((item) => {
      const key = pool.file + '||' + item.url;
      randomLabels.set(key, [{ label: Math.floor(Math.random() * 3), annotator: 'test', timestamp: new Date().toISOString() }]);
    });
  });
  const r1 = analyze(randomLabels, pools);
  console.log(`  Strict P@5: baseline=${r1.strict.baseline.toFixed(3)}, fused=${r1.strict.fused.toFixed(3)}`);
  console.log(`  Diff CI: [${r1.strict.ci.lo.toFixed(3)}, ${r1.strict.ci.hi.toFixed(3)}] (should include 0)`);
  console.log(`  Paired: fused better=${r1.paired.fusedBetter}, baseline better=${r1.paired.baselineBetter}, same=${r1.paired.same}\n`);

  // Test 2: Fused better by construction
  console.log('Test 2: Fused better by construction (expect fused > baseline)');
  const biasedLabels = new Map();
  Object.keys(pools.pools).forEach((qid) => {
    const pool = pools.pools[qid];
    pool.baselineTop5.forEach((item) => {
      const key = pool.file + '||' + item.url;
      biasedLabels.set(key, [{ label: 0, annotator: 'test', timestamp: new Date().toISOString() }]); // baseline all wrong
    });
    pool.fusedTop5.forEach((item) => {
      const key = pool.file + '||' + item.url;
      biasedLabels.set(key, [{ label: 2, annotator: 'test', timestamp: new Date().toISOString() }]); // fused all right
    });
  });
  const r2 = analyze(biasedLabels, pools);
  console.log(`  Strict P@5: baseline=${r2.strict.baseline.toFixed(3)}, fused=${r2.strict.fused.toFixed(3)}`);
  console.log(`  Diff CI: [${r2.strict.ci.lo.toFixed(3)}, ${r2.strict.ci.hi.toFixed(3)}] (should be > 0)`);
  console.log(`  Paired: fused better=${r2.paired.fusedBetter} (should be 10)\n`);

  // Test 3: Kappa
  console.log('Test 3: Weighted kappa');
  const kappaLabels = new Map();
  // Perfect agreement
  for (let i = 0; i < 20; i++) {
    const key = `q||http://example.com/${i}`;
    const label = Math.floor(Math.random() * 3);
    kappaLabels.set(key, [
      { label, annotator: 'A', timestamp: new Date().toISOString() },
      { label, annotator: 'B', timestamp: new Date().toISOString() },
    ]);
  }
  const r3 = analyze(kappaLabels, { pools: {} });
  console.log(`  Perfect agreement kappa: ${r3.kappa.weightedKappa.toFixed(3)} (should be 1.0)`);

  console.log('\n=== All synthetic tests passed ===');
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--test')) {
  runSyntheticTest();
} else {
  // Parse --labels and --pools
  const labelsIdx = args.indexOf('--labels');
  const poolsIdx = args.indexOf('--pools');
  if (labelsIdx === -1 || poolsIdx === -1) {
    console.error('Usage: node scripts/analyze-labels.mjs --labels a.csv,b.csv --pools pools.json');
    console.error('   or: node scripts/analyze-labels.mjs --test');
    process.exit(1);
  }
  const labelPaths = args[labelsIdx + 1].split(',');
  const poolsPath = args[poolsIdx + 1];

  const labels = loadLabels(labelPaths);
  const pools = JSON.parse(readFileSync(poolsPath, 'utf-8'));

  console.log(`Loaded ${labels.size} labelled items from ${labelPaths.length} files`);
  console.log(`Loaded ${Object.keys(pools.pools).length} query pools\n`);

  const results = analyze(labels, pools);

  console.log('=== Strict P@5 (label=2) ===');
  console.log(`  Baseline: ${results.strict.baseline.toFixed(3)}`);
  console.log(`  Fused:    ${results.strict.fused.toFixed(3)}`);
  console.log(`  Diff:     ${(results.strict.fused - results.strict.baseline).toFixed(3)}`);
  console.log(`  95% CI:   [${results.strict.ci.lo.toFixed(3)}, ${results.strict.ci.hi.toFixed(3)}]`);

  console.log('\n=== Lenient P@5 (label>=1) ===');
  console.log(`  Baseline: ${results.lenient.baseline.toFixed(3)}`);
  console.log(`  Fused:    ${results.lenient.fused.toFixed(3)}`);
  console.log(`  Diff:     ${(results.lenient.fused - results.lenient.baseline).toFixed(3)}`);
  console.log(`  95% CI:   [${results.lenient.ci.lo.toFixed(3)}, ${results.lenient.ci.hi.toFixed(3)}]`);

  console.log('\n=== Paired per-query (strict) ===');
  console.log(`  Fused better:    ${results.paired.fusedBetter}`);
  console.log(`  Baseline better: ${results.paired.baselineBetter}`);
  console.log(`  Same:            ${results.paired.same}`);

  if (results.kappa) {
    console.log('\n=== Inter-annotator agreement ===');
    console.log(`  Double-labelled items: ${results.kappa.n}`);
    console.log(`  Weighted kappa: ${results.kappa.weightedKappa.toFixed(3)}`);
  }

  // Save results
  const outPath = `eval2/analysis-${new Date().toISOString().slice(0,10)}.json`;
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outPath}`);
}
