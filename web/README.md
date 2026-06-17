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

## Cómo funciona

- **Datos**: se cargan los JSON de M+J por municipio y se agregan en cliente por
  CCAA / provincia / municipio (`src/data.ts`).
- **Listado** (`src/components/PanelLista.tsx`): tabla con drill-down
  España › CCAA › provincia › municipios.
- **Mapa** (`src/components/MapaProvincias.tsx`): coropleta de provincias con
  Leaflet y `public/geo/provincias.geojson` (códigos INE), coloreada por votos o
  % sobre válidos. Al hacer clic en una provincia se ven sus municipios.

> El mapa es de nivel provincia (los contornos de los ~8.000 municipios son
> demasiado pesados para empaquetarlos). El detalle por municipio se muestra en
> el listado. Si se quiere mapa municipal, se puede añadir GeoJSON simplificado
> por provincia y cargarlo bajo demanda.

## Despliegue

El workflow [`../.github/workflows/desplegar-web.yml`](../.github/workflows/desplegar-web.yml)
publica en GitHub Pages. De momento es **manual** (hosting por decidir).
