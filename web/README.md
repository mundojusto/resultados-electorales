# Web de visualización · M+J

App estática (React + Vite + TypeScript + Leaflet) para explorar los resultados
electorales de M+J por **comunidad autónoma, provincia y municipio**, en formato
**listado** y **mapa**.

## Desarrollo

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

`npm run dev` y `npm run build` ejecutan antes `scripts/copiar-datos.mjs`, que
copia los JSON de [`../resultados-oficiales-procesados/`](../resultados-oficiales-procesados)
a `public/datos/` y genera un `index.json` con las elecciones disponibles. Por
eso `public/datos/` está en `.gitignore`: la **fuente de verdad** son los JSON
procesados del repositorio.

## Build de producción

```bash
npm run build    # genera dist/ (sitio estático)
npm run preview  # sirve dist/ localmente
```

`vite.config.ts` usa `base: "./"`, así que `dist/` funciona en cualquier hosting
estático (incluido GitHub Pages en un subpath).

## Tests, lint y type-check

```bash
npm run lint       # eslint
npm run typecheck  # tsc -b
npm test           # vitest (tests de src/data.ts)
```

Se ejecutan automáticamente en cada Pull Request junto con el build, mediante
[`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Cómo funciona

- **Datos**: se cargan los JSON de M+J por municipio y se agregan en cliente por
  CCAA / provincia / municipio (`src/data.ts`).
- **Listado** (`src/components/PanelLista.tsx`): tabla con drill-down
  España › CCAA › provincia › municipios.
- **Mapa de provincias** (`src/components/MapaProvincias.tsx`): coropleta con
  Leaflet y `public/geo/provincias.geojson` (códigos INE), coloreada por votos o
  % sobre válidos. Al hacer clic en una provincia se entra en su mapa municipal.
- **Mapa de municipios** (`src/components/MapaMunicipios.tsx`): al seleccionar
  una provincia se carga **bajo demanda** `public/geo/municipios/<CPRO>.json` y
  se dibuja la coropleta de sus municipios (join por código INE `CUMUN`).

### Contornos de municipios

Los ~8.000 municipios se reparten en 52 ficheros (uno por provincia, ~50–200 KB)
en `public/geo/municipios/`, y solo se descarga el de la provincia que se abre.
Se generan con [`scripts/generar-municipios.sh`](scripts/generar-municipios.sh)
a partir de las secciones censales del INE (disueltas por municipio, simplificadas
y divididas por provincia). Solo hay que reejecutarlo si cambian los límites
municipales.

## Despliegue

El workflow [`../.github/workflows/desplegar-web.yml`](../.github/workflows/desplegar-web.yml)
publica en GitHub Pages. De momento es **manual** (hosting por decidir).
