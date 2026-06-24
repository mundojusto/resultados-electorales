// Tipos de los datos procesados de M+J (ver herramientas/procesar_resultados.py).

export interface Eleccion {
  tipo: string | null;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  ambito: string;
  fuente_archivo: string;
  fecha_procesado: string;
}

export interface Partido {
  nombre: string | null;
  siglas: string | null;
}

export interface Totales {
  votos_partido: number;
  votos_validos: number;
  votos_candidaturas: number;
  porcentaje_validos: number;
  municipios: number;
}

export interface RegistroMunicipio {
  comunidad: string;
  codigo_provincia: number | null;
  provincia: string;
  codigo_municipio: number | null;
  municipio: string;
  codigo_ine: string | null;
  censo: number | null;
  votantes: number | null;
  votos_validos: number;
  votos_candidaturas: number;
  votos_partido: number;
}

// Agregado por provincia, calculado sobre TODOS los municipios (incluidos los
// que no dieron votos a M+J). Conserva los denominadores correctos —votos
// válidos y nº de municipios— para las vistas y el mapa por provincia/comunidad
// sin tener que cargar los ~8.000 municipios en `resultados`.
export interface AgregadoProvincia {
  codigo_provincia: number | null;
  provincia: string;
  comunidad: string;
  votos_partido: number;
  votos_validos: number;
  votos_candidaturas: number;
  municipios: number;
}

export interface DatosEleccion {
  eleccion: Eleccion;
  partido: Partido;
  totales: Totales;
  // Agregado por provincia (todos los municipios).
  provincias: AgregadoProvincia[];
  // Detalle municipal, solo de los municipios con votos del partido (> 0).
  resultados: RegistroMunicipio[];
}

export interface EntradaIndice {
  fichero: string;
  tipo: string | null;
  // Comunidad autónoma a la que se circunscribe la elección (autonómicas,
  // cabildos…); null cuando abarca varias (municipales, generales, europeas).
  comunidad: string | null;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  totales: Totales | null;
}

// Fila agregada (CCAA / provincia / municipio) usada en listas y mapa.
export interface FilaAgregada {
  id: string; // nombre CCAA, código provincia (2 díg.) o código INE municipio
  nombre: string;
  votos_partido: number;
  votos_validos: number;
  porcentaje: number;
  // Solo para nivel municipio/provincia (para enlazar con el mapa):
  codigo_provincia?: number;
}

export type Nivel = "comunidad" | "provincia" | "municipio";
export type Metrica = "votos" | "porcentaje";

export type Vista = "exploracion" | "historico";

// --- Histórico (datos/historico.json) ---

export interface AgregadoVotos {
  votos_partido: number;
  votos_validos: number;
}

// Una elección dentro de la serie de un tipo de proceso.
export interface EntradaHistorico {
  fichero: string;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  total: AgregadoVotos;
  comunidades: Record<string, AgregadoVotos>;
}

// Histórico completo: tipo de proceso -> serie cronológica de elecciones.
export type Historico = Record<string, EntradaHistorico[]>;

// Punto de la serie ya resuelto para un tipo + comunidad (listo para el gráfico).
export interface PuntoHistorico {
  fichero: string;
  etiqueta: string;
  anio: number | null;
  mes: number | null;
  votos_partido: number;
  votos_validos: number;
  porcentaje: number;
}
