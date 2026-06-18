import type {
  DatosEleccion,
  EntradaIndice,
  FilaAgregada,
  Historico,
  PuntoHistorico,
  RegistroMunicipio,
} from "./types";

const BASE = `${import.meta.env.BASE_URL}datos/`;

export async function cargarIndice(): Promise<EntradaIndice[]> {
  const res = await fetch(`${BASE}index.json`);
  if (!res.ok) throw new Error("No se pudo cargar el índice de elecciones.");
  return res.json();
}

export async function cargarEleccion(fichero: string): Promise<DatosEleccion> {
  const res = await fetch(`${BASE}${fichero}`);
  if (!res.ok) throw new Error(`No se pudo cargar ${fichero}.`);
  return res.json();
}

export async function cargarHistorico(): Promise<Historico> {
  const res = await fetch(`${BASE}historico.json`);
  if (!res.ok) throw new Error("No se pudo cargar el histórico.");
  return res.json();
}

export function porcentaje(votos: number, validos: number): number {
  return validos > 0 ? (100 * votos) / validos : 0;
}

function ordenar(filas: FilaAgregada[]): FilaAgregada[] {
  return filas.sort((a, b) => b.votos_partido - a.votos_partido);
}

/** Agrega por comunidad autónoma. */
export function agregarPorComunidad(registros: RegistroMunicipio[]): FilaAgregada[] {
  const acc = new Map<string, { votos: number; validos: number }>();
  for (const r of registros) {
    const k = r.comunidad ?? "—";
    const a = acc.get(k) ?? { votos: 0, validos: 0 };
    a.votos += r.votos_partido;
    a.validos += r.votos_validos;
    acc.set(k, a);
  }
  return ordenar(
    [...acc.entries()].map(([nombre, a]) => ({
      id: nombre,
      nombre,
      votos_partido: a.votos,
      votos_validos: a.validos,
      porcentaje: porcentaje(a.votos, a.validos),
    })),
  );
}

/** Agrega por provincia, opcionalmente filtrando por una comunidad. */
export function agregarPorProvincia(
  registros: RegistroMunicipio[],
  comunidad?: string,
): FilaAgregada[] {
  const acc = new Map<
    string,
    { nombre: string; cod: number; votos: number; validos: number }
  >();
  for (const r of registros) {
    if (comunidad && r.comunidad !== comunidad) continue;
    const cod = r.codigo_provincia ?? 0;
    const k = String(cod).padStart(2, "0");
    const a = acc.get(k) ?? { nombre: r.provincia, cod, votos: 0, validos: 0 };
    a.votos += r.votos_partido;
    a.validos += r.votos_validos;
    acc.set(k, a);
  }
  return ordenar(
    [...acc.entries()].map(([id, a]) => ({
      id,
      nombre: a.nombre,
      codigo_provincia: a.cod,
      votos_partido: a.votos,
      votos_validos: a.validos,
      porcentaje: porcentaje(a.votos, a.validos),
    })),
  );
}

/** Municipios de una provincia (por código de provincia). */
export function municipiosDeProvincia(
  registros: RegistroMunicipio[],
  codigoProvincia: number,
): FilaAgregada[] {
  return ordenar(
    registros
      .filter((r) => r.codigo_provincia === codigoProvincia)
      .map((r) => ({
        id: r.codigo_ine ?? r.municipio,
        nombre: r.municipio,
        codigo_provincia: r.codigo_provincia ?? undefined,
        votos_partido: r.votos_partido,
        votos_validos: r.votos_validos,
        porcentaje: porcentaje(r.votos_partido, r.votos_validos),
      })),
  );
}

/** Mapa código provincia (2 díg.) -> valor agregado, para colorear el mapa. */
export function valoresPorProvincia(
  registros: RegistroMunicipio[],
): Map<string, FilaAgregada> {
  const filas = agregarPorProvincia(registros);
  return new Map(filas.map((f) => [f.id, f]));
}

/** Mapa código provincia (2 díg.) -> comunidad, para la vista por CCAA. */
export function provinciaAComunidad(
  registros: RegistroMunicipio[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of registros) {
    if (r.codigo_provincia != null) {
      m.set(String(r.codigo_provincia).padStart(2, "0"), r.comunidad);
    }
  }
  return m;
}

// --- Histórico ---

export const TODAS_COMUNIDADES = "__todas__";

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** Etiqueta corta para el eje del gráfico: "Abr 2019" o "2019". */
export function etiquetaPeriodo(anio: number | null, mes: number | null): string {
  if (anio == null) return "—";
  if (mes != null && mes >= 1 && mes <= 12) return `${MESES[mes]} ${anio}`;
  return String(anio);
}

/** Tipos de proceso electoral disponibles en el histórico, ordenados. */
export function tiposHistorico(historico: Historico): string[] {
  return Object.keys(historico).sort((a, b) => a.localeCompare(b, "es"));
}

/** Comunidades presentes en la serie de un tipo de proceso, ordenadas. */
export function comunidadesHistorico(
  historico: Historico,
  tipo: string,
): string[] {
  const set = new Set<string>();
  for (const e of historico[tipo] ?? []) {
    for (const c of Object.keys(e.comunidades)) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Serie histórica de votos para un tipo de proceso, opcionalmente filtrada por
 * una comunidad (usa TODAS_COMUNIDADES o null para el total nacional).
 */
export function serieHistorica(
  historico: Historico,
  tipo: string,
  comunidad?: string | null,
): PuntoHistorico[] {
  const entradas = historico[tipo] ?? [];
  const todas = !comunidad || comunidad === TODAS_COMUNIDADES;
  return entradas.map((e) => {
    const agg = todas ? e.total : e.comunidades[comunidad];
    const votos = agg?.votos_partido ?? 0;
    const validos = agg?.votos_validos ?? 0;
    return {
      fichero: e.fichero,
      etiqueta: etiquetaPeriodo(e.anio, e.mes),
      anio: e.anio,
      mes: e.mes,
      votos_partido: votos,
      votos_validos: validos,
      porcentaje: porcentaje(votos, validos),
    };
  });
}
