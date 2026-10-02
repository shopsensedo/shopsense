#!/usr/bin/env node
/**
 * Generate annotator assignments with 20% overlap for Cohen's kappa.
 *
 * Takes hand-label-data.json (250 items) and creates 3 assignment files:
 * - Each annotator gets ~100 items
 * - 50 items (20%) are assigned to 2 annotators for kappa calculation
 * - Assignments are deterministic (seeded) for reproducibility
 *
 * Usage: node scripts/gen-assignments.mjs
 * Output: public/assignments/annotator-{a,b,c}.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// Seeded RNG for reproducibility
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const data = JSON.parse(readFileSync('public/hand-label-data.json', 'utf-8'));

// Collect all item keys
const allItems = [];
data.queries.forEach((q) => {
  q.items.forEach((item) => {
    allItems.push({
      queryFile: q.file,
      queryPhoto: q.photo,
      url: item.url,
      title: item.title,
      priceText: item.priceText,
      image: item.image,
    });
  });
});

console.log(`Total items: ${allItems.length}`);

// Shuffle with seed
const rng = mulberry32(20261002);
const shuffled = [...allItems].sort(() => rng() - 0.5);

// 20% overlap = 50 items assigned to 2 annotators
const overlapCount = Math.floor(allItems.length * 0.2);
const overlapItems = shuffled.slice(0, overlapCount);
const uniqueItems = shuffled.slice(overlapCount);

console.log(`Overlap items (double-labelled): ${overlapItems.length}`);
console.log(`Unique items: ${uniqueItems.length}`);

// Split unique items into 3 groups
const groupSize = Math.ceil(uniqueItems.length / 3);
const groups = [
  uniqueItems.slice(0, groupSize),
  uniqueItems.slice(groupSize, groupSize * 2),
  uniqueItems.slice(groupSize * 2),
];

// Distribute overlap items: each pair of annotators shares some
// Annotator A+B share overlap[0:17], B+C share [17:34], A+C share [34:50]
const overlapAB = overlapItems.slice(0, 17);
const overlapBC = overlapItems.slice(17, 34);
const overlapAC = overlapItems.slice(34, 50);

const assignments = {
  a: [...groups[0], ...overlapAB, ...overlapAC],
  b: [...groups[1], ...overlapAB, ...overlapBC],
  c: [...groups[2], ...overlapBC, ...overlapAC],
};

// Build assignment files (group by query for the UI)
function buildAssignment(items, annotatorId) {
  const byQuery = new Map();
  items.forEach((item) => {
    if (!byQuery.has(item.queryFile)) {
      byQuery.set(item.queryFile, {
        file: item.queryFile,
        photo: item.queryPhoto,
        items: [],
      });
    }
    byQuery.get(item.queryFile).items.push({
      url: item.url,
      title: item.title,
      priceText: item.priceText,
      image: item.image,
    });
  });

  return {
    annotator: annotatorId,
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    queries: Array.from(byQuery.values()),
  };
}

mkdirSync('public/assignments', { recursive: true });

for (const [id, items] of Object.entries(assignments)) {
  const assignment = buildAssignment(items, id);
  const path = `public/assignments/annotator-${id}.json`;
  writeFileSync(path, JSON.stringify(assignment));
  console.log(`Annotator ${id.toUpperCase()}: ${items.length} items -> ${path}`);
}

// Verify overlap
const keysA = new Set(assignments.a.map((i) => i.queryFile + '||' + i.url));
const keysB = new Set(assignments.b.map((i) => i.queryFile + '||' + i.url));
const keysC = new Set(assignments.c.map((i) => i.queryFile + '||' + i.url));

const abOverlap = [...keysA].filter((k) => keysB.has(k)).length;
const bcOverlap = [...keysB].filter((k) => keysC.has(k)).length;
const acOverlap = [...keysA].filter((k) => keysC.has(k)).length;

console.log(`\nOverlap verification:`);
console.log(`  A∩B: ${abOverlap} items`);
console.log(`  B∩C: ${bcOverlap} items`);
console.log(`  A∩C: ${acOverlap} items`);
console.log(`  Total unique double-labelled: ${new Set([...keysA, ...keysB, ...keysC]).size < allItems.length ? 'ERROR' : 'OK'} (all ${allItems.length} items covered)`);
