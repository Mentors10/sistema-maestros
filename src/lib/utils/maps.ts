// ============================================================
// Utilidades de Google Maps
// ============================================================

/**
 * Construye un src para iframe de Google Maps embed
 */
export function buildMapEmbedSrc(linkOrAddress: string): string {
  if (!linkOrAddress || !linkOrAddress.trim()) return '';

  const text = linkOrAddress.trim();

  // Si ya es un iframe, extraer el src
  if (text.startsWith('<iframe')) {
    const match = text.match(/src="([^"]+)"/);
    if (match) return match[1];
  }

  // Si es un link de Maps embed
  if (text.includes('google.com/maps/embed')) {
    return text;
  }

  // Si es un link de Google Maps (cualquier formato)
  if (text.includes('google.com/maps') || text.includes('maps.app.goo.gl') || text.includes('goo.gl/maps')) {
    // Para links normales de Maps, usar embed API
    return `https://maps.google.com/maps?q=${encodeURIComponent(text)}&output=embed`;
  }

  // Si es coordenadas o una dirección
  return `https://maps.google.com/maps?q=${encodeURIComponent(text)}&output=embed`;
}

/**
 * Construye un link para abrir en Google Maps app/web
 */
export function buildMapOpenLink(linkOrAddress: string): string {
  if (!linkOrAddress) return '';

  const text = linkOrAddress.trim();

  // Si ya es un link de Maps, devolver tal cual
  if (text.includes('google.com/maps') || text.includes('maps.app.goo.gl') || text.includes('goo.gl/maps')) {
    return text;
  }

  // Para direcciones, construir link de búsqueda
  return `https://www.google.com/maps/search/${encodeURIComponent(text)}`;
}

/**
 * Construye un link para compartir por WhatsApp con ubicación
 */
export function buildWhatsAppMapLink(telefono: string, lugar: string, mapLink: string): string {
  const message = `📍 Ubicación: ${lugar}\n🗺️ ${mapLink || 'Ver en Google Maps'}`;
  const phone = telefono.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
