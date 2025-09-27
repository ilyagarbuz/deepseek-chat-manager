/**
 * Utility functions for the DeepSeek Manager Extension
 */

/**
 * Generates a random hex color
 * @returns A random hex color string (e.g., "#FF5733")
 */
export function generateRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Generates a random color with better distribution
 * Uses HSL color space for more vibrant colors
 * @returns A random hex color string
 */
export function generateVibrantColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
  const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%

  return hslToHex(hue, saturation, lightness);
}

/**
 * Converts HSL color to hex
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates a color from a string (useful for consistent colors based on folder names)
 * @param str Input string
 * @returns Hex color string
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30); // 60-90%
  const lightness = 45 + (Math.abs(hash >> 8) % 20); // 45-65%

  return hslToHex(hue, saturation, lightness);
}
