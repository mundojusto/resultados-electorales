// Candidaturas, calendario y tareas de las sedes para las generales del 29-N.
//
// Complementa a `avales.ts`: aquel calcula firmas; este, cuántas personas hacen
// falta en las listas de cada provincia y qué plazos no se pueden pasar. Las
// personas tampoco se guardan en el JSON: se derivan de los escaños, igual que
// los avales se derivan del censo.
import { diaNumero, diasEntre, type ProvinciaAvales } from "./avales";

/** Fecha supuesta de publicación de la convocatoria en el BOE (día 0). */
export const DIA_BOE = "2026-10-06";

/** Suplentes del Congreso que recomienda la Comisión Electoral (no obligatorios). */
export const SUPLENTES_CONGRESO_RECOM = 2;

/**
 * Personas distintas imprescindibles para presentar Congreso y Senado:
 * titulares del Congreso más cada candidatura al Senado con su suplente.
 */
export function personasMinimo(p: Pick<ProvinciaAvales, "congreso" | "senado">): number {
  return p.congreso + 2 * p.senado;
}

/** Objetivo de cada sede: el mínimo legal más los suplentes recomendados. */
export function personasRecomendado(p: Pick<ProvinciaAvales, "congreso" | "senado">): number {
  return personasMinimo(p) + SUPLENTES_CONGRESO_RECOM;
}

export interface TotalesPersonas {
  provincias: number;
  congreso: number;
  senado: number;
  minimo: number;
  recomendado: number;
}

export function totalesPersonas(ps: ProvinciaAvales[]): TotalesPersonas {
  const t: TotalesPersonas = { provincias: ps.length, congreso: 0, senado: 0, minimo: 0, recomendado: 0 };
  for (const p of ps) {
    t.congreso += p.congreso;
    t.senado += p.senado;
    t.minimo += personasMinimo(p);
    t.recomendado += personasRecomendado(p);
  }
  return t;
}

export interface EscenarioPersonas {
  etiqueta: string;
  minimo: number;
  recomendado: number;
}

/** Mismos escenarios que en avales (por censo), medidos en personas. */
export function escenariosPersonas(ps: ProvinciaAvales[]): EscenarioPersonas[] {
  const porCenso = [...ps].sort((a, b) => a.censo - b.censo);
  const e = (etiqueta: string, sel: ProvinciaAvales[]) => {
    const t = totalesPersonas(sel);
    return { etiqueta, minimo: t.minimo, recomendado: t.recomendado };
  };
  const lista = [
    e("40 provincias · las de menor censo", porCenso.slice(0, 40)),
    e("42 provincias · las de menor censo", porCenso.slice(0, 42)),
    e("40 provincias · las de mayor censo", porCenso.slice(-40)),
    e("42 provincias · las de mayor censo", porCenso.slice(-42)),
    e(`Las ${ps.length} provincias`, ps),
  ];
  const elegidas = ps.filter((p) => p.seleccionada === true);
  if (elegidas.length) lista.unshift(e(`Provincias elegidas (${elegidas.length})`, elegidas));
  return lista;
}

export interface GrupoComunidad {
  comunidad: string;
  provincias: ProvinciaAvales[];
  minimo: number;
  recomendado: number;
}

export function porComunidad(ps: ProvinciaAvales[]): GrupoComunidad[] {
  const m = new Map<string, ProvinciaAvales[]>();
  for (const p of ps) m.set(p.comunidad, [...(m.get(p.comunidad) ?? []), p]);
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([comunidad, provincias]) => {
      const t = totalesPersonas(provincias);
      return { comunidad, provincias, minimo: t.minimo, recomendado: t.recomendado };
    });
}

// --- Calendario detallado ------------------------------------------------------

export interface Evento {
  desde: string; // AAAA-MM-DD
  hasta?: string;
  que: string; // qué pasa (plazo legal o hito)
  sede: string; // qué hace la sede
  clave?: boolean; // plazo legal que no se puede pasar
  interno?: boolean; // plazo interno fijado por M+J
}

export const CALENDARIO_DETALLADO: Evento[] = [
  {
    desde: "2026-10-04",
    hasta: "2026-10-05",
    que: "Firma del decreto. Reunión de la Coordinadora Nacional.",
    sede: "Nombrar responsable electoral provincial. Enviar a la Comisión Electoral la lista de personas disponibles para ir en listas.",
  },
  {
    desde: "2026-10-06",
    que: "Publicación en el BOE. Empieza el proceso.",
    sede: "Arranca la recogida de avales. Llamamiento a la afiliación para completar listas.",
    clave: true,
  },
  {
    desde: "2026-10-09",
    que: "—",
    sede: "Propuesta de cabezas de lista, de representante de candidatura y de administrador/a provincial.",
    interno: true,
  },
  {
    desde: "2026-10-12",
    que: "Festivo nacional.",
    sede: "Recogida de avales en la calle si hay afluencia. Juntas y registros cerrados.",
  },
  {
    desde: "2026-10-13",
    que: "—",
    sede: "Listas completas en orden cremallera enviadas a la Comisión Electoral.",
    interno: true,
  },
  {
    desde: "2026-10-14",
    que: "Último día para designar al representante general ante la Junta Electoral Central (lo hace la Comisión Electoral).",
    sede: "Nada que hacer salvo confirmar los datos que pida la Comisión.",
    clave: true,
  },
  {
    desde: "2026-10-16",
    que: "Último día para designar representantes de candidatura y administrador/a electoral. Con el administrador/a se abre la cuenta electoral.",
    sede: "Las personas propuestas, localizables y con el DNI a mano por si hay que firmar algo.",
    clave: true,
  },
  {
    desde: "2026-10-19",
    que: "—",
    sede: "Aceptaciones firmadas y copia del DNI de todas las personas de las listas, titulares y suplentes.",
    interno: true,
  },
  {
    desde: "2026-10-20",
    que: "—",
    sede: "Cierre de la recogida de avales con margen.",
    interno: true,
  },
  {
    desde: "2026-10-21",
    hasta: "2026-10-26",
    que: "Presentación de candidaturas ante la Junta Electoral Provincial (con avales).",
    sede: "Presentar el expediente. Objetivo: entre el 21 y el 23.",
    clave: true,
  },
  {
    desde: "2026-10-26",
    que: "Fecha límite: se cierra la presentación.",
    sede: "Solo para incidencias. No dejar nada para este día.",
    clave: true,
  },
  {
    desde: "2026-10-28",
    que: "Publicación en el BOE de las candidaturas presentadas.",
    sede: "Revisar nombres, DNI, orden y denominación. Cualquier error se comunica de inmediato a la Comisión.",
  },
  {
    desde: "2026-10-28",
    hasta: "2026-11-02",
    que: "La Junta comunica irregularidades: 48 horas para subsanar.",
    sede: "El representante de candidatura, localizable y con todo el expediente.",
  },
  {
    desde: "2026-11-02",
    que: "Proclamación de candidaturas. Desde aquí las listas no se pueden cambiar.",
    sede: "Pedir a la Junta Electoral de Zona los emplazamientos gratuitos para carteles y los locales para actos.",
    clave: true,
  },
  {
    desde: "2026-10-27",
    hasta: "2026-11-12",
    que: "Precampaña.",
    sede: "Permisos para carpas y mesas, formación exprés, reclutamiento de apoderados e interventores.",
  },
  {
    desde: "2026-11-13",
    que: "Empieza la campaña a las 0:00.",
    sede: "Ya se puede pedir el voto, pegar carteles en los lugares autorizados y hacer actos.",
    clave: true,
  },
  {
    desde: "2026-11-19",
    que: "Último día para solicitar el voto por correo.",
    sede: "Recordarlo a quien no vaya a estar en su localidad el 29.",
  },
  {
    desde: "2026-11-24",
    que: "Desde hoy no se pueden publicar encuestas.",
    sede: "No difundir sondeos en redes, tampoco propios.",
  },
  {
    desde: "2026-11-26",
    que: "Último día para designar interventores.",
    sede: "Lista de interventores y apoderados entregada, con credenciales.",
    clave: true,
  },
  {
    desde: "2026-11-27",
    que: "Termina la campaña a medianoche.",
    sede: "Último acto.",
  },
  {
    desde: "2026-11-28",
    que: "Jornada de reflexión.",
    sede: "Ninguna actividad de campaña, tampoco en redes. Preparar el día D.",
  },
  {
    desde: "2026-11-29",
    que: "Votación.",
    sede: "Apoderados e interventores en los colegios. Recogida de resultados por mesa.",
    clave: true,
  },
  {
    desde: "2026-12-02",
    que: "Escrutinio general en las Juntas Electorales.",
    sede: "Asistir si hay reclamaciones que presentar.",
  },
  {
    desde: "2026-12-07",
    que: "—",
    sede: "Todas las facturas y justificantes de gasto de la sede, al administrador/a.",
    interno: true,
  },
];

/** Día contado desde la publicación en el BOE: "Día 0", "Días 15 a 20" o "Víspera". */
export function diaDesdeBoe(e: Pick<Evento, "desde" | "hasta">): string {
  const a = diasEntre(DIA_BOE, e.desde);
  if (a < 0) return "Víspera";
  if (!e.hasta || e.hasta === e.desde) return `Día ${a}`;
  return `Días ${a} a ${diasEntre(DIA_BOE, e.hasta)}`;
}

export type EstadoEvento = "pasado" | "hoy" | "futuro";

export function estadoEvento(e: Pick<Evento, "desde" | "hasta">, hoy: string): EstadoEvento {
  const h = diaNumero(hoy);
  if (h > diaNumero(e.hasta ?? e.desde)) return "pasado";
  if (h >= diaNumero(e.desde)) return "hoy";
  return "futuro";
}

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-06" → "mar 6 oct". */
export function fechaConDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS_SEMANA[dow]} ${d} ${MESES[m - 1]}`;
}

/** Texto de la fecha de un evento: "mar 6 oct", "mié 21 – lun 26 oct". */
export function fechaEvento(e: Pick<Evento, "desde" | "hasta">): string {
  if (!e.hasta || e.hasta === e.desde) return fechaConDia(e.desde);
  const [, m1] = e.desde.split("-").map(Number);
  const [, m2] = e.hasta.split("-").map(Number);
  const ini = fechaConDia(e.desde);
  return m1 === m2
    ? `${ini.replace(/ \S+$/, "")} – ${fechaConDia(e.hasta)}`
    : `${ini} – ${fechaConDia(e.hasta)}`;
}

/**
 * Próximo plazo que vence en `hoy` o después (eventos clave o internos). Para
 * un tramo cuenta su último día. null cuando ya han pasado todos.
 */
export function proximoPlazo(
  hoy: string,
  eventos: Evento[] = CALENDARIO_DETALLADO,
): { evento: Evento; vence: string; dias: number } | null {
  const candidatos = eventos
    .filter((e) => e.clave || e.interno)
    .map((e) => ({ evento: e, vence: e.hasta ?? e.desde }))
    .filter((c) => diasEntre(hoy, c.vence) >= 0)
    .sort((a, b) => diaNumero(a.vence) - diaNumero(b.vence));
  const c = candidatos[0];
  return c ? { ...c, dias: diasEntre(hoy, c.vence) } : null;
}

// --- Tareas de las sedes, por semanas -----------------------------------------

export interface Semana {
  id: string;
  titulo: string;
  desde: string;
  hasta: string;
  tareas: { id: string; texto: string; destacado?: string }[];
}

// Los `id` de las tareas se guardan en el navegador al marcarlas: no cambiarlos
// sin necesidad, o se pierden las marcas ya hechas.
export const SEMANAS: Semana[] = [
  {
    id: "s0",
    titulo: "Semana 0 · hasta el lunes 5 de octubre",
    desde: "2026-09-28",
    hasta: "2026-10-05",
    tareas: [
      { id: "s0-responsable", texto: "Nombrar responsable electoral provincial y comunicarlo a la Comisión Electoral." },
      { id: "s0-listas-avales", texto: "Nombrar responsable de listas y responsable de avales." },
      { id: "s0-base", texto: "Revisar la base de afiliación de la provincia: quién está activo, quién podría ir en listas, quién podría recoger avales." },
      { id: "s0-relacion", texto: "Enviar a la Comisión Electoral una primera relación de personas dispuestas a ir en listas, indicando sexo (para la cremallera) y si quieren encabezar." },
      { id: "s0-logistica", texto: "Preparar la logística de avales: puntos de recogida, turnos, material." },
    ],
  },
  {
    id: "s1",
    titulo: "Semana 1 · 6 a 11 de octubre",
    desde: "2026-10-06",
    hasta: "2026-10-11",
    tareas: [
      { id: "s1-avales", texto: "Arrancar la recogida de avales el día 6 con los impresos oficiales." },
      { id: "s1-llamamiento", texto: "Llamamiento a toda la afiliación de la provincia para completar listas, con plazo de respuesta de 72 horas." },
      { id: "s1-propuestas", destacado: "Vie 9 oct", texto: "enviar propuesta de cabezas de lista (Congreso y Senado), de representante de candidatura y de administrador/a." },
      { id: "s1-votacion", texto: "Si hay más de una candidatura a la cabeza de lista, la Comisión abre votación interna sin quórum mínimo; si no hay ninguna, la Coordinadora nombra por compromiso y antigüedad (Reglamento, art. 88)." },
      { id: "s1-aceptaciones", texto: "Empezar a recoger aceptaciones y copias del DNI de quien ya haya dicho que sí." },
    ],
  },
  {
    id: "s2",
    titulo: "Semana 2 · 12 a 18 de octubre",
    desde: "2026-10-12",
    hasta: "2026-10-18",
    tareas: [
      { id: "s2-listas", destacado: "Mar 13 oct", texto: "listas completas del Congreso y del Senado, en orden cremallera, enviadas a la Comisión Electoral." },
      { id: "s2-bolsa", texto: "Si faltan personas el día 13, avisar a la Comisión ese mismo día para tirar de la bolsa nacional. Esperar al día 18 es tarde." },
      { id: "s2-avales", texto: "Recogida intensiva de avales y primera revisión de pliegos." },
      { id: "s2-designaciones", texto: "Confirmar que el representante de candidatura y el administrador/a quedan designados el 16." },
    ],
  },
  {
    id: "s3",
    titulo: "Semana 3 · 19 a 25 de octubre",
    desde: "2026-10-19",
    hasta: "2026-10-25",
    tareas: [
      { id: "s3-aceptaciones", destacado: "Lun 19 oct", texto: "todas las aceptaciones firmadas y copias del DNI reunidas y revisadas." },
      { id: "s3-cierre-avales", destacado: "Mar 20 oct", texto: "cierre interno de avales con margen." },
      { id: "s3-expediente", texto: "Montar el expediente: escrito de presentación (lo prepara la Comisión Electoral), listas, aceptaciones, DNI y avales." },
      { id: "s3-presentar", destacado: "21 a 23 oct", texto: "presentar en la Junta Electoral Provincial y pedir justificante sellado." },
      { id: "s3-justificante", texto: "Escanear el justificante y enviarlo a la Comisión Electoral el mismo día." },
    ],
  },
  {
    id: "s4",
    titulo: "Semana 4 · 26 de octubre a 2 de noviembre",
    desde: "2026-10-26",
    hasta: "2026-11-02",
    tareas: [
      { id: "s4-incidencias", texto: "El 26 solo se usa para incidencias." },
      { id: "s4-boe", destacado: "Mié 28 oct", texto: "revisar en el BOE la publicación de nuestra candidatura (nombres, orden, DNI, denominación y siglas)." },
      { id: "s4-localizable", texto: "Mantener al representante de candidatura localizable con el expediente completo hasta la proclamación." },
      { id: "s4-requerimientos", texto: "Responder en menos de 48 horas a cualquier requerimiento de la Junta, siempre en coordinación con la Comisión." },
      { id: "s4-proclamacion", destacado: "Lun 2 nov", texto: "confirmar la proclamación." },
    ],
  },
  {
    id: "s5",
    titulo: "Semanas 5 y 6 · precampaña, 3 a 12 de noviembre",
    desde: "2026-11-03",
    hasta: "2026-11-12",
    tareas: [
      { id: "s5-emplazamientos", texto: "Pedir a la Junta Electoral de Zona y al ayuntamiento la relación de emplazamientos gratuitos para carteles y de locales públicos para actos, y solicitar los que interesen." },
      { id: "s5-permisos", texto: "Tramitar permisos municipales para carpas y mesas informativas." },
      { id: "s5-material", texto: "Cerrar el inventario de material y recibir el material común que envíe la Coordinación de Comunicación." },
      { id: "s5-apoderados", texto: "Reclutar apoderados e interventores. Objetivo mínimo: un apoderado por cada colegio electoral grande de la capital de provincia y de los municipios donde tengamos más afiliación." },
      { id: "s5-formacion", texto: "Formación exprés para candidatas, candidatos, apoderados e interventores." },
    ],
  },
  {
    id: "s7",
    titulo: "Semanas 7 y 8 · campaña, 13 a 29 de noviembre",
    desde: "2026-11-13",
    hasta: "2026-11-29",
    tareas: [
      { id: "s7-actos", texto: "Actos, mesas informativas y cartelería en los lugares autorizados." },
      { id: "s7-correo", destacado: "Jue 19 nov", texto: "último día para que la afiliación pida el voto por correo." },
      { id: "s7-interventores", destacado: "Jue 26 nov", texto: "relación de interventores entregada por el representante de candidatura a la Junta Electoral de Zona, y credenciales de apoderados en mano." },
      { id: "s7-reflexion", destacado: "Sáb 28 nov", texto: "reflexión. Repartir credenciales y la hoja de mesas." },
      { id: "s7-votacion", destacado: "Dom 29 nov", texto: "presencia en los colegios, copia del acta de cada mesa cubierta y envío de resultados a la Comisión Electoral antes de las 23:00." },
    ],
  },
  {
    id: "s9",
    titulo: "Después del 29-N",
    desde: "2026-11-30",
    hasta: "2026-12-15",
    tareas: [
      { id: "s9-escrutinio", destacado: "Mié 2 dic", texto: "asistir al escrutinio general si hay algo que reclamar." },
      { id: "s9-facturas", destacado: "Lun 7 dic", texto: "entregar al administrador/a todas las facturas y justificantes de gasto." },
      { id: "s9-balance", texto: "Reunión de balance de la sede y envío de conclusiones a la Coordinadora Nacional antes del 15 de diciembre." },
    ],
  },
];
