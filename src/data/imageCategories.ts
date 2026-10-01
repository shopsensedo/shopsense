/**
 * Product categories for image-search zero-shot classification.
 *
 * The uploaded photo is embedded with CLIP's vision tower and compared
 * against the text embedding of `a photo of <label>` for each category
 * (encoded at runtime by the in-browser text tower, so no 512-dim vectors
 * need to be shipped). The winning category's `daraz`/`priceoye` phrasing
 * is sent to the live-search API. Keep this list broad: the FYP panel may
 * test an image of anything.
 */
export interface ImageCategory {
  /** stable key, also the fallback marketplace query */
  key: string;
  /** natural-language label used in the `a photo of <label>` prompt */
  label: string;
  /** tuned query phrasing for Daraz's catalog search */
  daraz: string;
  /** tuned query phrasing for PriceOye's suggest API */
  priceoye: string;
}

export const IMAGE_CATEGORIES: ImageCategory[] = [
  { key: 'mobile', label: 'smartphone', daraz: 'smartphone', priceoye: '5g mobile' },
  { key: 'laptop', label: 'laptop', daraz: 'laptop', priceoye: 'laptop' },
  { key: 'tablet', label: 'tablet', daraz: 'tablet', priceoye: 'tablet' },
  { key: 'earbuds', label: 'earbuds', daraz: 'earbuds', priceoye: 'earbuds' },
  { key: 'headphones', label: 'headphones', daraz: 'headphones', priceoye: 'headphones' },
  { key: 'earphones', label: 'earphones', daraz: 'earphones', priceoye: 'earphones' },
  { key: 'smartwatch', label: 'smartwatch', daraz: 'smartwatch', priceoye: 'smartwatch' },
  { key: 'fitness band', label: 'fitness tracker', daraz: 'fitness band', priceoye: 'fitness band' },
  { key: 'charger', label: 'phone charger', daraz: 'charger', priceoye: 'charger' },
  { key: 'cable', label: 'usb cable', daraz: 'usb cable', priceoye: 'data cable' },
  { key: 'power bank', label: 'power bank', daraz: 'power bank', priceoye: 'power bank' },
  { key: 'speaker', label: 'bluetooth speaker', daraz: 'bluetooth speaker', priceoye: 'speaker' },
  { key: 'keyboard', label: 'keyboard', daraz: 'keyboard', priceoye: 'keyboard' },
  { key: 'mouse', label: 'computer mouse', daraz: 'mouse', priceoye: 'mouse' },
  { key: 'monitor', label: 'computer monitor', daraz: 'monitor', priceoye: 'monitor' },
  { key: 'camera', label: 'camera', daraz: 'camera', priceoye: 'camera' },
  { key: 'drone', label: 'drone', daraz: 'drone', priceoye: 'drone' },
  { key: 'printer', label: 'printer', daraz: 'printer', priceoye: 'printer' },
  { key: 'router', label: 'wifi router', daraz: 'wifi router', priceoye: 'router' },
  { key: 'microphone', label: 'microphone', daraz: 'microphone', priceoye: 'microphone' },
  { key: 'calculator', label: 'calculator', daraz: 'calculator', priceoye: 'calculator' },
  { key: 'torch', label: 'flashlight torch', daraz: 'torch', priceoye: 'torch' },
  { key: 'trimmer', label: 'hair trimmer', daraz: 'trimmer', priceoye: 'trimmer' },
  { key: 'hair dryer', label: 'hair dryer', daraz: 'hair dryer', priceoye: 'hair dryer' },
  { key: 'iron', label: 'clothes iron', daraz: 'electric iron', priceoye: 'iron' },
  { key: 'table fan', label: 'table fan', daraz: 'table fan', priceoye: 'fan' },
  { key: 'extension board', label: 'extension socket', daraz: 'extension board', priceoye: 'extension board' },
  { key: 'shoes', label: 'shoes', daraz: 'shoes', priceoye: 'shoes' },
  { key: 'sneakers', label: 'sneakers', daraz: 'sneakers', priceoye: 'sneakers' },
  { key: 'sandals', label: 'sandals', daraz: 'sandals', priceoye: 'sandals' },
  { key: 'slippers', label: 'slippers', daraz: 'slippers', priceoye: 'slippers' },
  { key: 'kurta', label: 'kurta', daraz: 'kurta', priceoye: 'kurta' },
  { key: 'shalwar kameez', label: 'shalwar kameez', daraz: 'shalwar kameez', priceoye: 'shalwar kameez' },
  { key: 'tshirt', label: 'tshirt', daraz: 'tshirt', priceoye: 'tshirt' },
  { key: 'shirt', label: 'shirt', daraz: 'shirt', priceoye: 'shirt' },
  { key: 'jeans', label: 'jeans', daraz: 'jeans', priceoye: 'jeans' },
  { key: 'jacket', label: 'jacket', daraz: 'jacket', priceoye: 'jacket' },
  { key: 'hoodie', label: 'hoodie', daraz: 'hoodie', priceoye: 'hoodie' },
  { key: 'sweater', label: 'sweater', daraz: 'sweater', priceoye: 'sweater' },
  { key: 'suit', label: 'suit', daraz: 'suit', priceoye: 'suit' },
  { key: 'dress', label: 'dress', daraz: 'dress', priceoye: 'dress' },
  { key: 'saree', label: 'saree', daraz: 'saree', priceoye: 'saree' },
  { key: 'abaya', label: 'abaya', daraz: 'abaya', priceoye: 'abaya' },
  { key: 'watch', label: 'watch', daraz: 'watch', priceoye: 'watch' },
  { key: 'handbag', label: 'handbag', daraz: 'handbag', priceoye: 'handbag' },
  { key: 'backpack', label: 'backpack', daraz: 'backpack', priceoye: 'backpack' },
  { key: 'wallet', label: 'wallet', daraz: 'wallet', priceoye: 'wallet' },
  { key: 'belt', label: 'belt', daraz: 'belt', priceoye: 'belt' },
  { key: 'sunglasses', label: 'sunglasses', daraz: 'sunglasses', priceoye: 'sunglasses' },
  { key: 'cap', label: 'cap', daraz: 'cap', priceoye: 'cap' },
  { key: 'tie', label: 'tie', daraz: 'tie', priceoye: 'tie' },
  { key: 'socks', label: 'socks', daraz: 'socks', priceoye: 'socks' },
  { key: 'chair', label: 'chair', daraz: 'chair', priceoye: 'chair' },
  { key: 'table', label: 'table', daraz: 'table', priceoye: 'table' },
  { key: 'lamp', label: 'lamp', daraz: 'lamp', priceoye: 'lamp' },
  { key: 'bedsheet', label: 'bedsheet', daraz: 'bedsheet', priceoye: 'bedsheet' },
  { key: 'curtain', label: 'curtain', daraz: 'curtain', priceoye: 'curtain' },
  { key: 'pillow', label: 'pillow', daraz: 'pillow', priceoye: 'pillow' },
  { key: 'clock', label: 'wall clock', daraz: 'wall clock', priceoye: 'clock' },
  { key: 'mirror', label: 'mirror', daraz: 'mirror', priceoye: 'mirror' },
  { key: 'kettle', label: 'electric kettle', daraz: 'electric kettle', priceoye: 'kettle' },
  { key: 'dinner set', label: 'dinner set', daraz: 'dinner set', priceoye: 'dinner set' },
  { key: 'bottle', label: 'water bottle', daraz: 'water bottle', priceoye: 'bottle' },
  { key: 'lunch box', label: 'lunch box', daraz: 'lunch box', priceoye: 'lunch box' },
  { key: 'frying pan', label: 'frying pan', daraz: 'frying pan', priceoye: 'frying pan' },
  { key: 'perfume', label: 'perfume', daraz: 'perfume', priceoye: 'perfume' },
  { key: 'face cream', label: 'face cream', daraz: 'face cream', priceoye: 'cream' },
  { key: 'shampoo', label: 'shampoo', daraz: 'shampoo', priceoye: 'shampoo' },
  { key: 'soap', label: 'soap', daraz: 'soap', priceoye: 'soap' },
  { key: 'lipstick', label: 'lipstick', daraz: 'lipstick', priceoye: 'lipstick' },
  { key: 'football', label: 'football', daraz: 'football', priceoye: 'football' },
  { key: 'cricket bat', label: 'cricket bat', daraz: 'cricket bat', priceoye: 'cricket bat' },
  { key: 'dumbbell', label: 'dumbbell', daraz: 'dumbbell', priceoye: 'dumbbell' },
  { key: 'toys', label: 'toys', daraz: 'toys', priceoye: 'toys' },
  { key: 'diapers', label: 'baby diapers', daraz: 'diapers', priceoye: 'diapers' },
  { key: 'school bag', label: 'school bag', daraz: 'school bag', priceoye: 'school bag' },
  { key: 'notebook', label: 'notebook', daraz: 'notebook', priceoye: 'notebook' },
  { key: 'umbrella', label: 'umbrella', daraz: 'umbrella', priceoye: 'umbrella' },
  { key: 'helmet', label: 'helmet', daraz: 'helmet', priceoye: 'helmet' },
  { key: 'bicycle', label: 'bicycle', daraz: 'bicycle', priceoye: 'bicycle' },
];
