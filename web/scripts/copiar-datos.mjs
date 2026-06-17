// Copia los JSON de resultados-oficiales-procesados/ a public/datos/ y genera
// un index.json con la lista de elecciones disponibles para la app.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, "..", "..", "resultados-oficiales-procesados");
const destino = join(aqui, "..", "public", "datos");

mkdirSync(destino, { recursive: true });

const ficheros = readdirSync(origen).filter((f) => f.endsWith(".json"));
const indice = [];

for (const f of ficheros) {
  copyFileSync(join(origen, f), join(destino, f));
  const datos = JSON.parse(readFileSync(join(origen, f), "utf-8"));
  indice.push({
    fichero: f,
    tipo: datos.eleccion?.tipo ?? null,
    periodo: datos.eleccion?.periodo ?? null,
    anio: datos.eleccion?.anio ?? null,
    mes: datos.eleccion?.mes ?? null,
    totales: datos.totales ?? null,
  });
}

indice.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0) || (b.mes ?? 0) - (a.mes ?? 0));
writeFileSync(join(destino, "index.json"), JSON.stringify(indice, null, 2));

console.log(`Copiadas ${ficheros.length} elecciones a public/datos/ (+ index.json).`);
