// Normalización de nombres de comunidad autónoma.
//
// Los ficheros oficiales usan convenciones distintas según el año y el proceso:
// espacios de relleno al final ("Andalucía          "), orden de palabras
// invertido ("Madrid, Comunidad de" vs "Comunidad de Madrid"), el prefijo
// "Ciudad de" en las ciudades autónomas y variantes lingüísticas
// ("Catalunya" vs "Cataluña"). Sin normalizar, el histórico —que agrega varias
// elecciones de distintos años— mostraba la misma comunidad duplicada.
//
// `ALIAS` es la única fuente de verdad (compartida con scripts/copiar-datos.mjs)
// y solo contiene las variantes que difieren del nombre canónico.
import ALIAS from "./comunidades.json";

const alias = ALIAS as Record<string, string>;

/**
 * Devuelve el nombre canónico de una comunidad autónoma: recorta y colapsa los
 * espacios y resuelve las variantes conocidas. Si no hay alias, devuelve el
 * nombre ya limpio.
 */
export function normalizarComunidad(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").replace(/\s+/g, " ").trim();
  return alias[limpio] ?? limpio;
}
