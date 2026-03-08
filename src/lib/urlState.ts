import pako from "pako";

/**
 * Compress SQL string into a URL-safe base64 string
 */
export function compressToURL(sql: string): string {
  const compressed = pako.deflate(new TextEncoder().encode(sql));
  // Convert Uint8Array to base64
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decompress a URL-safe base64 string back to SQL
 */
export function decompressFromURL(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = pako.inflate(bytes);
  return new TextDecoder().decode(decompressed);
}
