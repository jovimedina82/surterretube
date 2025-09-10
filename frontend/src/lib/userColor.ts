// Deterministic color from a string (stable across reloads)

// lightweight FNV-1a hash
function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Accessible, distinct palette (tweak as you like)
const PALETTE = [
  '#3d6864', // brand teal
  '#2563eb', '#4f46e5', '#7c3aed', '#d946ef',
  '#e11d48', '#ef4444', '#f97316', '#f59e0b',
  '#65a30d', '#10b981', '#06b6d4',
];

export function colorForUser(seed: string) {
  const i = hash(seed.toLowerCase()) % PALETTE.length;
  return PALETTE[i];
}
