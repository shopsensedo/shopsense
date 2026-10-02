/**
 * R3 — eval query manifest (60 queries: 30 photo + 30 text).
 *
 * Photo entries: file (eval2/photos/), subject, and keyword sets for the
 * agent rubric. `yes` = title contains a same-product-type keyword → 1.0;
 * `partly` = related category/accessory → 0.5; else → 0.0.
 * Labels are AGENT-MADE (keyword rubric on titles) until the user
 * spot-checks the CSV sample.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PHOTOS_DIR = fileURLToPath(new URL('../../eval2/photos/', import.meta.url));

// Commons images: freely licensed (see eval2/photos/manifest.json for
// author/licence/URL per file). Seed images: user's own product photos.
export const PHOTO_QUERIES = [
  { file: 'sneakers_1.jpg', subject: 'sneakers', yes: ['sneaker', 'sneakers', 'shoe', 'shoes', 'jogger', 'trainer'], partly: ['socks', 'insole', 'lace', 'slipper'] },
  { file: 'sneakers_2.jpg', subject: 'sneakers', yes: ['sneaker', 'sneakers', 'shoe', 'shoes', 'jogger', 'trainer'], partly: ['socks', 'insole', 'lace', 'slipper'] },
  { file: 'sneakers_3.jpg', subject: 'sneakers', yes: ['sneaker', 'sneakers', 'shoe', 'shoes', 'jogger', 'trainer'], partly: ['socks', 'insole', 'lace', 'slipper'] },
  { file: 'handbag_1.jpg', subject: 'handbag', yes: ['handbag', 'hand bag', 'purse', 'clutch', 'shoulder bag'], partly: ['wallet', 'tote', 'backpack'] },
  { file: 'handbag_2.jpg', subject: 'handbag', yes: ['handbag', 'hand bag', 'purse', 'clutch', 'shoulder bag'], partly: ['wallet', 'tote', 'backpack'] },
  { file: 'handbag_3.jpg', subject: 'handbag', yes: ['handbag', 'hand bag', 'purse', 'clutch', 'shoulder bag'], partly: ['wallet', 'tote', 'backpack'] },
  { file: 'watch_1.jpg', subject: 'wristwatch', yes: ['watch', 'wristwatch', 'chronograph'], partly: ['strap', 'clock'] },
  { file: 'watch_2.jpg', subject: 'wristwatch', yes: ['watch', 'wristwatch', 'chronograph'], partly: ['strap', 'clock', 'smartwatch', 'smart watch'] },
  { file: 'watch_3.jpg', subject: 'wristwatch', yes: ['watch', 'wristwatch', 'chronograph'], partly: ['strap', 'clock'] },
  { file: 'sunglasses_1.jpg', subject: 'sunglasses', yes: ['sunglass', 'sunglasses', 'shades', 'eyewear', 'goggles'], partly: ['eyeglasses', 'spectacles', 'frame'] },
  { file: 'sunglasses_2.jpg', subject: 'sunglasses', yes: ['sunglass', 'sunglasses', 'shades', 'eyewear', 'goggles'], partly: ['eyeglasses', 'spectacles', 'frame'] },
  { file: 'sunglasses_3.jpg', subject: 'sunglasses', yes: ['sunglass', 'sunglasses', 'shades', 'eyewear', 'goggles'], partly: ['eyeglasses', 'spectacles', 'frame'] },
  { file: 'headphones_1.jpg', subject: 'headphones', yes: ['headphone', 'headphones', 'headset', 'earphone', 'earbud', 'airbud'], partly: ['speaker', 'audio', 'mic'] },
  { file: 'headphones_2.jpg', subject: 'headphones', yes: ['headphone', 'headphones', 'headset', 'earphone', 'earbud', 'airbud'], partly: ['speaker', 'audio', 'mic'] },
  { file: 'headphones_3.jpg', subject: 'headphones', yes: ['headphone', 'headphones', 'headset', 'earphone', 'earbud', 'airbud'], partly: ['speaker', 'audio', 'mic'] },
  { file: 'backpack_1.jpg', subject: 'backpack', yes: ['backpack', 'rucksack', 'knapsack', 'bagpack'], partly: ['duffel', 'luggage', 'tote'] },
  { file: 'backpack_2.jpg', subject: 'backpack', yes: ['backpack', 'rucksack', 'knapsack', 'bagpack'], partly: ['duffel', 'luggage', 'tote'] },
  { file: 'backpack_3.jpg', subject: 'backpack', yes: ['backpack', 'rucksack', 'knapsack', 'bagpack'], partly: ['duffel', 'luggage', 'tote'] },
  { file: 'perfume_1.jpg', subject: 'perfume bottle', yes: ['perfume', 'fragrance', 'cologne', 'attar', 'eau de parfum', 'parfum'], partly: ['deodorant', 'body spray', 'mist'] },
  { file: 'perfume_2.jpg', subject: 'perfume bottle', yes: ['perfume', 'fragrance', 'cologne', 'attar', 'eau de parfum', 'parfum'], partly: ['deodorant', 'body spray', 'mist'] },
  { file: 'perfume_3.jpg', subject: 'perfume bottle', yes: ['perfume', 'fragrance', 'cologne', 'attar', 'eau de parfum', 'parfum'], partly: ['deodorant', 'body spray', 'mist'] },
  { file: 'dress_1.jpg', subject: 'dress', yes: ['dress', 'gown', 'frock', 'kurti', 'kurta'], partly: ['skirt', 'top', 'suit'] },
  { file: 'dress_2.jpg', subject: 'dress', yes: ['dress', 'gown', 'frock', 'kurti', 'kurta'], partly: ['skirt', 'top', 'suit'] },
  { file: 'dress_3.jpg', subject: 'dress', yes: ['dress', 'gown', 'frock', 'kurti', 'kurta'], partly: ['skirt', 'top', 'suit'] },
  // User's own product photos (FYP seed set)
  { file: 'seed_shoe_black_slipon.webp', subject: 'black slip-on shoes', seed: 'shoe_black_slipon.webp', yes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'slip', 'loafer'], partly: ['socks', 'sandal'] },
  { file: 'seed_shoe_red_nike.jpg', subject: 'red nike shoes', seed: 'shoe_red_nike.jpg', yes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'nike'], partly: ['socks', 'sandal'] },
  { file: 'seed_shoe_white_nike.jpg', subject: 'white nike shoes', seed: 'shoe_white_nike.jpg', yes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'nike'], partly: ['socks', 'sandal'] },
  { file: 'seed_watch_round.jpg', subject: 'round wristwatch', seed: 'watch_round.jpg', yes: ['watch', 'wristwatch'], partly: ['strap', 'clock', 'smartwatch'] },
  { file: 'seed_bag_leather.jpg', subject: 'leather handbag', seed: 'bag_leather.jpg', yes: ['handbag', 'hand bag', 'purse', 'bag', 'leather'], partly: ['wallet', 'tote', 'backpack'] },
  { file: 'seed_shoe_sneaker_blue.jpg', subject: 'blue sneakers', seed: 'shoe_sneaker_blue.jpg', yes: ['shoe', 'shoes', 'sneaker', 'sneakers'], partly: ['socks', 'sandal'] },
].map((q) => ({
  ...q,
  path: q.seed
    ? fileURLToPath(new URL(`../../../shopsense-backend/data/seed_images/${q.seed}`, import.meta.url))
    : path.join(PHOTOS_DIR, q.file),
}));

export const TEXT_QUERIES = [
  // English (10) — from the T5 set
  'nike white sneakers', 'audionic', 'milli sneakers', 'sneakers', 'power bank',
  'laptop', 'perfume', 'leather handbag', 'smartwatch', 'sunglasses',
  // Roman Urdu (12)
  'kala joota', 'sasta smartwatch dikhao', 'bachon ke kapray', 'safaid kurta',
  'sasti ghari', 'lal handbag', 'neela backpack', 'sasta perfume',
  'mujhe kala joota chahiye', 'charger dikhao', 'AC wala cooler', 'sunehri watch',
  // Mixed / brands (8)
  'adidas running shoes', 'dawlance fridge', 'haier washing machine',
  'sasta iphone cover', 'kurti lawn', 'khussa shoes', 'shalwar kameez',
  'baby diapers pack',
].map((query) => ({ query }));

// Seed-image licence records (appended to the Commons manifest at report time)
export const SEED_LICENCE = {
  source: "User-provided — project owner's own product photos (FYP seed set, ~/workspace/shopsense-backend/data/seed_images/)",
  files: ['shoe_black_slipon.webp', 'shoe_red_nike.jpg', 'shoe_white_nike.jpg', 'watch_round.jpg', 'bag_leather.jpg', 'shoe_sneaker_blue.jpg'],
};
