// Copia los JSON de resultados-oficiales-procesados/ a public/datos/ y genera:
//  - index.json: lista de elecciones disponibles (para la vista de exploración).
//  - historico.json: serie cronológica por tipo de proceso electoral, con los
//    votos agregados por comunidad autónoma (para la vista de histórico).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, "..", "..", "resultados-oficiales-procesados");
const destino = join(aqui, "..", "public", "datos");

// Misma normalización de comunidades que la app web (src/comunidades.ts),
// compartiendo la fuente única de alias para no duplicar el mapeo. Sin esto,
// el histórico —que agrega elecciones de varios años con convenciones de
// nombre distintas— mostraba la misma comunidad duplicada.
const ALIAS = JSON.parse(
  readFileSync(join(aqui, "..", "src", "comunidades.json"), "utf-8"),
);
const normalizarComunidad = (nombre) => {
  const limpio = (nombre ?? "").replace(/\s+/g, " ").trim();
  return ALIAS[limpio] ?? limpio;
};

mkdirSync(destino, { recursive: true });

const ficheros = readdirSync(origen).filter((f) => f.endsWith(".json"));
const indice = [];
const historico = {}; // tipo -> array de elecciones

for (const f of ficheros) {
  copyFileSync(join(origen, f), join(destino, f));
  const datos = JSON.parse(readFileSync(join(origen, f), "utf-8"));
  const tipo = datos.eleccion?.tipo ?? null;
  const anio = datos.eleccion?.anio ?? null;
  const mes = datos.eleccion?.mes ?? null;

  indice.push({
    fichero: f,
    tipo,
    periodo: datos.eleccion?.periodo ?? null,
    anio,
    mes,
    totales: datos.totales ?? null,
  });

  // El histórico solo tiene sentido para elecciones con tipo de proceso; las
  // entradas sin tipo (ficheros sueltos sin metadatos) se quedan en el índice
  // pero no contaminan los desplegables del histórico.
  if (tipo == null) continue;

  // Agregado de votos por comunidad autónoma para el histórico, con el nombre
  // de comunidad ya normalizado para no duplicar entradas entre años.
  const comunidades = {};
  for (const r of datos.resultados ?? []) {
    const k = normalizarComunidad(r.comunidad);
    const a = comunidades[k] ?? { votos_partido: 0, votos_validos: 0 };
    a.votos_partido += r.votos_partido ?? 0;
    a.votos_validos += r.votos_validos ?? 0;
    comunidades[k] = a;
  }

  (historico[tipo] ??= []).push({
    fichero: f,
    periodo: datos.eleccion?.periodo ?? null,
    anio,
    mes,
    total: {
      votos_partido: datos.totales?.votos_partido ?? 0,
      votos_validos: datos.totales?.votos_validos ?? 0,
    },
    comunidades,
  });
}

indice.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0) || (b.mes ?? 0) - (a.mes ?? 0));
writeFileSync(join(destino, "index.json"), JSON.stringify(indice, null, 2));

// Cada serie del histórico, ordenada cronológicamente (de antigua a reciente).
for (const tipo of Object.keys(historico)) {
  historico[tipo].sort(
    (a, b) => (a.anio ?? 0) - (b.anio ?? 0) || (a.mes ?? 0) - (b.mes ?? 0),
  );
}
writeFileSync(join(destino, "historico.json"), JSON.stringify(historico, null, 2));

console.log(
  `Copiadas ${ficheros.length} elecciones a public/datos/ (+ index.json, historico.json).`,
);
