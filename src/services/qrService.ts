// Utilities to work with ticket QR payloads
// New format (preferred): RUT only, e.g., "12345678-K" (normalized: no dots, uppercased)
// Backward-compatible format: ORD:<order>|EMAIL:<email>|QTY:<n>[|RUT:<rut>]

export interface ParsedTicketQR {
  order?: string;
  email?: string;
  quantity?: number;
  rut?: string;
}

export const parseTicketQR = (payload: string): ParsedTicketQR | null => {
  try {
    const raw = (payload || '').trim();
    if (!raw) return null;

    // If string looks like simple RUT-only (no pipes), accept as rut
    if (!raw.includes('|')) {
      const norm = raw.replace(/\.|-/g, '').toUpperCase();
      return { rut: norm };
    }

    // Backward-compatible: key-value pairs separated by '|'
    const parts = raw.split('|');
    const map = new Map<string, string>();
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (!key || value === undefined) continue;
      map.set(key.trim(), value.trim());
    }
    const order = map.get('ORD') || undefined;
    const email = map.get('EMAIL') || undefined;
    const qtyStr = map.get('QTY');
    const rutRaw = map.get('RUT') || undefined;
    const quantity = qtyStr !== undefined ? parseInt(qtyStr, 10) : undefined;
    const rut = rutRaw ? rutRaw.replace(/\.|-/g, '').toUpperCase() : undefined;

    // If there is at least one recognized field, return parsed
    if (order || email || quantity || rut) {
      return { order, email, quantity, rut };
    }
    return null;
  } catch {
    return null;
  }
};

// Validate scanned QR against expected user RUT
export const validateTicketQR = (payload: string, expectedRut: string): boolean => {
  const parsed = parseTicketQR(payload);
  if (!parsed) return false;
  if (!parsed.rut) return false; // Require RUT present for strict validation
  const norm = (s: string) => s.replace(/\.|-/g, '').toUpperCase();
  return norm(parsed.rut) === norm(expectedRut);
};
