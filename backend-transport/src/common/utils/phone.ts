/**
 * Normaliza un teléfono al formato internacional sin "+" (ej. 59171234567).
 * Si el número tiene 9 dígitos o menos antepone el código de país.
 */
export function normalizarTelefono(
  telefono: string | null | undefined,
  codigoPais = '591',
): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 9) return `${codigoPais}${digitos.replace(/^0+/, '')}`;
  return digitos;
}
