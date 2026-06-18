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

export interface DatosEleccion {
  eleccion: Eleccion;
  partido: Partido;
  totales: Totales;
  resultados: RegistroMunicipio[];
}

export interface EntradaIndice {
  fichero: string;
  tipo: string | null;
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
