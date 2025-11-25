// Servicio de validación de entradas mediante comparación de RUT
// Compara el RUT del QR de la entrada con el RUT del QR del carnet de identidad

import { parseTicketQR } from './qrService';

export interface ValidationResult {
  isValid: boolean;
  ticketRut?: string;
  idCardRut?: string;
  message: string;
  timestamp: string;
}

export interface ValidationRecord extends ValidationResult {
  id: string;
}

/**
 * Normaliza un RUT chileno eliminando puntos, guiones y convirtiendo a mayúsculas
 * Ejemplo: "12.345.678-9" -> "123456789"
 */
const normalizeRut = (rut: string): string => {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
};

/**
 * Valida el formato y dígito verificador de un RUT chileno
 */
export const validateRutFormat = (rut: string): boolean => {
  const normalized = normalizeRut(rut);
  if (normalized.length < 2) return false;

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);

  // Validar que el cuerpo sea numérico
  if (!/^\d+$/.test(body)) return false;

  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = 11 - (sum % 11);
  let calculatedDv = '';

  if (expectedDv === 11) {
    calculatedDv = '0';
  } else if (expectedDv === 10) {
    calculatedDv = 'K';
  } else {
    calculatedDv = expectedDv.toString();
  }

  return dv === calculatedDv;
};

/**
 * Extrae el RUT del QR de una entrada
 * El QR de la entrada contiene solo el RUT normalizado
 */
export const extractTicketRut = (qrPayload: string): string | null => {
  try {
    const raw = (qrPayload || '').trim();
    if (!raw) return null;

    // 1) Buscar patrón de RUT en cualquier texto (con o sin guion/puntos)
    const anyRutPattern = /(\d{7,8}-?[\dkK])/g;
    const anyMatch = raw.match(anyRutPattern);
    if (anyMatch && anyMatch.length > 0) {
      const candidate = anyMatch[0];
      const normalizedCandidate = normalizeRut(candidate);
      if (validateRutFormat(normalizedCandidate)) return normalizedCandidate;
    }

    // 2) Intentar parsear con el parser existente (soporta formato antiguo y nuevo)
    const parsed = parseTicketQR(raw);
    if (parsed && parsed.rut) {
      const normalizedParsed = normalizeRut(parsed.rut);
      if (validateRutFormat(normalizedParsed)) return normalizedParsed;
    }

    // 3) Intentar parsear como JSON con posibles claves { rut, RUT, run }
    try {
      const obj = JSON.parse(raw);
      const candidate = obj?.rut || obj?.RUT || obj?.run || obj?.RUN;
      if (candidate) {
        const normalized = normalizeRut(String(candidate));
        if (validateRutFormat(normalized)) return normalized;
      }
    } catch {}

    // 4) Si el QR es solo el RUT (nuevo formato)
    const normalized = normalizeRut(raw);
    if (validateRutFormat(normalized)) {
      return normalized;
    }

    return null;
  } catch (error) {
    console.error('Error extracting ticket RUT:', error);
    return null;
  }
};

/**
 * Extrae el RUT del QR de un carnet de identidad chileno
 * Formatos comunes:
 * - RUN:12345678-9\nNOMBRE:JUAN PEREZ\n...
 * - 12345678-9<JUAN<PEREZ<...
 * - Formato PDF417 de cédula chilena
 */
export const extractIdCardRut = (qrPayload: string): string | null => {
  try {
    const raw = (qrPayload || '').trim();
    if (!raw) return null;

    // 1) Formato URL del Registro Civil: .../docstatus?RUN=12.345.678-9&...
    try {
      const url = new URL(raw);
      const runParam = url.searchParams.get('RUN') || url.searchParams.get('run');
      if (runParam) {
        const normalized = normalizeRut(runParam);
        if (validateRutFormat(normalized)) return normalized;
      }
    } catch {
      // Fallback: regex para extraer RUN= del querystring sin depender de URL
      const m = raw.match(/(?:[?&]RUN=)([^&]+)/i);
      if (m && m[1]) {
        const value = decodeURIComponent(m[1]);
        const normalized = normalizeRut(value);
        if (validateRutFormat(normalized)) return normalized;
      }
    }

    // 2) Intentar JSON primero
    try {
      const obj = JSON.parse(raw);
      const candidate = obj?.rut || obj?.RUT || obj?.run || obj?.RUN;
      if (candidate) {
        const normalized = normalizeRut(String(candidate));
        if (validateRutFormat(normalized)) return normalized;
      }
    } catch {}

    const lines = raw.split(/[\n\r]+/);

    // Formato 1: RUN:12345678-9
    for (const line of lines) {
      if (line.toUpperCase().startsWith('RUN:') || line.toUpperCase().startsWith('RUT:')) {
        const rut = line.substring(4).trim();
        const normalized = normalizeRut(rut);
        if (validateRutFormat(normalized)) {
          return normalized;
        }
      }
    }

    // Formato 2: 12345678-9<NOMBRE<APELLIDO (separado por <)
    const parts = raw.split('<');
    if (parts.length > 0) {
      const possibleRut = parts[0].trim();
      const normalized = normalizeRut(possibleRut);
      if (validateRutFormat(normalized)) {
        return normalized;
      }
    }

    // Formato 3: Buscar patrón de RUT en el texto (XX.XXX.XXX-X o XXXXXXXX-X)
    const rutPattern = /(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/g;
    const matches = raw.match(rutPattern);
    if (matches && matches.length > 0) {
      const normalized = normalizeRut(matches[0]);
      if (validateRutFormat(normalized)) {
        return normalized;
      }
    }

    // Formato 4: RUT sin formato (solo números y dígito verificador)
    const cleanPattern = /(\d{7,8}[\dkK])/g;
    const cleanMatches = raw.match(cleanPattern);
    if (cleanMatches && cleanMatches.length > 0) {
      const normalized = normalizeRut(cleanMatches[0]);
      if (validateRutFormat(normalized)) {
        return normalized;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting ID card RUT:', error);
    return null;
  }
};

/**
 * Valida una entrada comparando el RUT del ticket con el RUT del carnet
 */
export const validateEntry = (
  ticketQr: string,
  idCardQr: string
): ValidationResult => {
  const timestamp = new Date().toISOString();

  // Extraer RUT de la entrada
  const ticketRut = extractTicketRut(ticketQr);
  if (!ticketRut) {
    return {
      isValid: false,
      ticketRut: undefined,
      idCardRut: undefined,
      message: 'No se pudo extraer el RUT del QR de la entrada. Verifica que el código sea válido.',
      timestamp,
    };
  }

  // Extraer RUT del carnet
  const idCardRut = extractIdCardRut(idCardQr);
  if (!idCardRut) {
    return {
      isValid: false,
      ticketRut,
      idCardRut: undefined,
      message: 'No se pudo extraer el RUT del carnet de identidad. Verifica que el código sea válido.',
      timestamp,
    };
  }

  // Comparar RUTs normalizados
  const isValid = ticketRut === idCardRut;

  return {
    isValid,
    ticketRut,
    idCardRut,
    message: isValid
      ? '✅ Entrada válida. Los RUTs coinciden.'
      : '❌ Entrada inválida. Los RUTs NO coinciden.',
    timestamp,
  };
};

/**
 * Formatea un RUT para visualización
 * Ejemplo: "123456789" -> "12.345.678-9"
 */
export const formatRutForDisplay = (rut: string): string => {
  const normalized = normalizeRut(rut);
  if (normalized.length < 2) return rut;

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);

  // Agregar puntos al cuerpo
  let formatted = '';
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formatted = '.' + formatted;
    }
    formatted = body[i] + formatted;
  }

  return `${formatted}-${dv}`;
};

/**
 * Guarda un registro de validación en localStorage
 */
export const saveValidationRecord = (result: ValidationResult): void => {
  try {
    const record: ValidationRecord = {
      ...result,
      id: `val_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };

    const stored = localStorage.getItem('validation_records');
    const records: ValidationRecord[] = stored ? JSON.parse(stored) : [];
    
    // Agregar el nuevo registro
    records.push(record);

    // Mantener solo los últimos 500 registros
    if (records.length > 500) {
      records.splice(0, records.length - 500);
    }

    localStorage.setItem('validation_records', JSON.stringify(records));
  } catch (error) {
    console.error('Error saving validation record:', error);
  }
};

/**
 * Obtiene el historial de validaciones del día actual
 */
export const getTodayValidations = (): ValidationRecord[] => {
  try {
    const stored = localStorage.getItem('validation_records');
    if (!stored) return [];

    const records: ValidationRecord[] = JSON.parse(stored);
    const today = new Date().toDateString();

    return records.filter(record => {
      const recordDate = new Date(record.timestamp).toDateString();
      return recordDate === today;
    });
  } catch (error) {
    console.error('Error getting today validations:', error);
    return [];
  }
};

/**
 * Limpia el historial de validaciones
 */
export const clearValidationHistory = (): void => {
  try {
    localStorage.removeItem('validation_records');
  } catch (error) {
    console.error('Error clearing validation history:', error);
  }
};
