// Recogida de avales para las elecciones generales del 29-N.
//
// Los datos por provincia viven en `provincias-29n.json` (censo aproximado,
// escaños y, cuando la Comisión Electoral los vaya cargando, recuentos y
// enlaces). El mínimo legal y los objetivos NO se guardan: se calculan aquí a
// partir del censo, para que no puedan desincronizarse si se corrige un censo.
import PROVINCIAS from "./provincias-29n.json";

export type TipoSede = "oficial" | "media" | "sin_sede";

export const ESTADOS = [
  "No iniciado",
  "En recogida",
  "Cerca del mínimo",
  "Mínimo alcanzado",
  "Margen alcanzado",
  "Revisado",
  "Presentado",
] as const;
export type EstadoAvales = (typeof ESTADOS)[number];

export interface ProvinciaAvales {
  codigo: string; // código INE de provincia (2 dígitos), como en provincias.geojson
  provincia: string;
  comunidad: string;
  sede: TipoSede;
  congreso: number;
  senado: number;
  censo: number;
  // Rellenados por la Comisión Electoral a partir del 5-6 de octubre.
  seleccionada: boolean | null;
  avales_papel: number | null;
  avales_boreal: number | null;
  avales_revisados: number | null;
  estado: EstadoAvales;
  url_impreso: string | null;
  url_boreal: string | null;
}

export const PROVINCIAS_AVALES = PROVINCIAS as ProvinciaAvales[];

export const ETIQUETA_SEDE: Record<TipoSede, string> = {
  oficial: "Sede oficial",
  media: "Sede de prioridad media",
  sin_sede: "Sin sede",
};

/** Mínimo legal: 0,1 % del censo, redondeado al alza (LOREG, art. 169.3). */
export function minimoLegal(censo: number): number {
  return Math.ceil(censo / 1000);
}

/** Objetivo interno con un margen (0,2 = +20 %) sobre el mínimo, al alza. */
export function objetivo(censo: number, margen: number): number {
  // El épsilon evita que 1,2 × 5 = 6,000000000000001 suba a 7.
  return Math.ceil(minimoLegal(censo) * (1 + margen) - 1e-9);
}

/** Avales ya recogidos (papel + Boreal). null si aún no hay recuento. */
export function avalesRecogidos(p: ProvinciaAvales): number | null {
  if (p.avales_papel == null && p.avales_boreal == null) return null;
  return (p.avales_papel ?? 0) + (p.avales_boreal ?? 0);
}

/** Fracción del objetivo +30 % ya cubierta (0 si no hay recuento). */
export function progreso(p: ProvinciaAvales): number {
  const r = avalesRecogidos(p) ?? 0;
  return r / objetivo(p.censo, 0.3);
}

export interface Totales {
  provincias: number;
  censo: number;
  minimo: number;
  objetivo20: number;
  objetivo30: number;
  congreso: number;
  senado: number;
}

export function totales(ps: ProvinciaAvales[]): Totales {
  const t: Totales = {
    provincias: ps.length,
    censo: 0,
    minimo: 0,
    objetivo20: 0,
    objetivo30: 0,
    congreso: 0,
    senado: 0,
  };
  for (const p of ps) {
    t.censo += p.censo;
    t.minimo += minimoLegal(p.censo);
    t.objetivo20 += objetivo(p.censo, 0.2);
    t.objetivo30 += objetivo(p.censo, 0.3);
    t.congreso += p.congreso;
    t.senado += p.senado;
  }
  return t;
}

export interface Escenario {
  etiqueta: string;
  minimo: number;
  objetivo30: number;
  porDia: number;
}

/** Días útiles de recogida que se usan para calcular el ritmo diario. */
export const DIAS_UTILES = 15;

function escenario(etiqueta: string, ps: ProvinciaAvales[]): Escenario {
  const t = totales(ps);
  return {
    etiqueta,
    minimo: t.minimo,
    objetivo30: t.objetivo30,
    porDia: Math.round(t.objetivo30 / DIAS_UTILES),
  };
}

/**
 * Escenarios de esfuerzo según cuántas y qué provincias se elijan. Si la
 * Coordinadora ya ha marcado las seleccionadas, se añade ese escenario real.
 */
export function escenarios(ps: ProvinciaAvales[]): Escenario[] {
  const porCenso = [...ps].sort((a, b) => a.censo - b.censo);
  const lista = [
    escenario("40 provincias · las de menor censo", porCenso.slice(0, 40)),
    escenario("42 provincias · las de menor censo", porCenso.slice(0, 42)),
    escenario("40 provincias · las de mayor censo", porCenso.slice(-40)),
    escenario("42 provincias · las de mayor censo", porCenso.slice(-42)),
    escenario(`Las ${ps.length} provincias`, ps),
  ];
  const elegidas = ps.filter((p) => p.seleccionada === true);
  if (elegidas.length) {
    lista.unshift(escenario(`Provincias elegidas (${elegidas.length})`, elegidas));
  }
  return lista;
}

// --- Calendario --------------------------------------------------------------

export interface Hito {
  desde: string; // AAAA-MM-DD
  hasta: string;
  titulo: string;
  detalle: string;
  clave?: boolean;
}

// Supuesto de planificación: convocatoria publicada en el BOE el 6-oct-2026.
export const ANIO = 2026;
export const INICIO_RECOGIDA = "2026-10-06";
export const CIERRE_INTERNO = "2026-10-20";
export const ULTIMO_DIA = "2026-10-26";
export const DIA_VOTACION = "2026-11-29";

export const CALENDARIO: Hito[] = [
  {
    desde: "2026-10-06",
    hasta: "2026-10-11",
    titulo: "Fase 1 · Lanzamiento",
    detalle: "Publicación en el BOE el martes 6 y arranque de la recogida. Meta: 50–60 % del objetivo de cada provincia.",
    clave: true,
  },
  {
    desde: "2026-10-12",
    hasta: "2026-10-18",
    titulo: "Fase 2 · Recogida intensiva",
    detalle: "Primera revisión de pliegos. El lunes 12 es festivo: se puede recoger en la calle, pero muchos locales cierran.",
  },
  {
    desde: "2026-10-19",
    hasta: "2026-10-20",
    titulo: "Fase 3 · Completar mínimo y margen",
    detalle: "Todas las provincias deben llegar al mínimo legal y al margen. Cierre interno recomendado: martes 20.",
    clave: true,
  },
  {
    desde: "2026-10-21",
    hasta: "2026-10-23",
    titulo: "Fase 4 · Revisión y expedientes",
    detalle: "Revisión final y preparación de expedientes. Se abre la presentación ante cada Junta Electoral Provincial.",
  },
  {
    desde: "2026-10-24",
    hasta: "2026-10-25",
    titulo: "Fase 5 · Margen de seguridad",
    detalle: "Días reservados para resolver problemas de última hora.",
  },
  {
    desde: "2026-10-26",
    hasta: "2026-10-26",
    titulo: "Último día de presentación",
    detalle: "Se cierra la recogida. Último día para presentar candidaturas y avales.",
    clave: true,
  },
  {
    desde: "2026-10-28",
    hasta: "2026-11-02",
    titulo: "Publicación y subsanación",
    detalle: "Se publican las candidaturas y se abre el plazo para corregir errores. Proclamación el lunes 2 de noviembre.",
  },
];

/** Convierte "AAAA-MM-DD" en un número de día (sin husos horarios de por medio). */
export function diaNumero(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86_400_000);
}

/** Fecha local de hoy en formato "AAAA-MM-DD". */
export function hoyISO(ahora: Date = new Date()): string {
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${m}-${d}`;
}

export function diasEntre(desde: string, hasta: string): number {
  return diaNumero(hasta) - diaNumero(desde);
}

export type Momento =
  | { tipo: "antes"; dias: number } // días que faltan para empezar
  | { tipo: "recogida"; dia: number; quedan: number } // día N de recogida y días hasta el cierre
  | { tipo: "cerrada" };

/** En qué punto de la recogida estamos en la fecha `hoy`. */
export function momento(hoy: string): Momento {
  const antes = diasEntre(hoy, INICIO_RECOGIDA);
  if (antes > 0) return { tipo: "antes", dias: antes };
  const quedan = diasEntre(hoy, ULTIMO_DIA);
  if (quedan < 0) return { tipo: "cerrada" };
  return { tipo: "recogida", dia: -antes + 1, quedan };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-06" → "6 oct". */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/** Texto de un tramo de fechas: "6 oct" o "6–11 oct" o "28 oct – 2 nov". */
export function tramo(h: Hito): string {
  if (h.desde === h.hasta) return fechaCorta(h.desde);
  const [, m1, d1] = h.desde.split("-").map(Number);
  const [, m2] = h.hasta.split("-").map(Number);
  return m1 === m2 ? `${d1}–${fechaCorta(h.hasta)}` : `${fechaCorta(h.desde)} – ${fechaCorta(h.hasta)}`;
}

// En español, toLocaleString no agrupa los números de cuatro cifras (5253);
// forzamos el punto de millar para que la tabla se lea de forma uniforme.
const FORMATO = new Intl.NumberFormat("es-ES", {
  useGrouping: "always",
} as unknown as Intl.NumberFormatOptions);
export const fmt = (n: number) => FORMATO.format(n);
