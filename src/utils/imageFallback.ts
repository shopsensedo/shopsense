// Shared broken-image fallback: swaps any failed <img> for a neutral
// on-brand placeholder so external image URLs never render as broken icons.
import React from 'react';

const PLACEHOLDER_SVG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
      `<rect width="400" height="400" fill="#1A1A1A"/>` +
      `<circle cx="200" cy="170" r="52" fill="none" stroke="#B9C006" stroke-width="10"/>` +
      `<path d="M200 140 v30 l20 20" fill="none" stroke="#B9C006" stroke-width="10" stroke-linecap="round"/>` +
      `<rect x="120" y="260" width="160" height="14" rx="7" fill="#333"/>` +
      `<rect x="150" y="284" width="100" height="10" rx="5" fill="#262626"/>` +
      `</svg>`
  );

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.src !== PLACEHOLDER_SVG) {
    img.src = PLACEHOLDER_SVG;
  }
}
