# resultados-electorales

Sitio web / app para mostrar los **Resultados Electorales de M+J**
(Por Un Mundo Más Justo).

## Estructura

```
resultados-electorales/
├── datos-oficiales/                  # XLSX oficiales subidos (entrada)
├── resultados-oficiales-procesados/  # JSON de M+J generados (salida)
├── herramientas/                     # Procesador XLSX -> JSON
│   ├── procesar_resultados.py
│   └── requirements.txt
├── web/                              # App de visualización (React + Vite + TS)
├── deploy/                           # Despliegue en Plesk (script + nginx)
└── .github/workflows/
    ├── ci.yml                        # CI: lint + tests + validación + build en cada PR
    ├── procesar-resultados.yml       # CI/CD: procesa los XLSX automáticamente
    └── desplegar-web.yml             # Despliegue de la web (GitHub Pages, manual)
```

## Pipeline de datos

1. Se sube un XLSX oficial (votos por municipio: Congreso, Senado, Europeas o
   Cabildos) a [`datos-oficiales/`](./datos-oficiales).
2. El workflow de GitHub Actions lo procesa con
   [`herramientas/procesar_resultados.py`](./herramientas/procesar_resultados.py),
   que extrae **solo los resultados de M+J**.
3. Guarda un JSON en
   [`resultados-oficiales-procesados/`](./resultados-oficiales-procesados),
   borra el XLSX original y commitea los cambios.

Detalles y uso local en [`herramientas/README.md`](./herramientas/README.md).

## Visualización

App web ([`web/`](./web)) en React + Vite + TypeScript + Leaflet que muestra los
resultados por **comunidad autónoma, provincia y municipio**, en **listado** y
**mapa** (coropleta de provincias y, al entrar en una provincia, de sus
municipios). Detalles y uso en [`web/README.md`](./web/README.md).

```bash
cd web && npm install && npm run dev
```

## Tests y CI

En cada **Pull Request**, el workflow
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) ejecuta automáticamente:

- **Procesador (Python):** lint (`ruff`), tests (`pytest`) y validación de los
  JSON procesados + GeoJSON (`herramientas/validar_datos.py`).
- **Web (React/TS):** lint (`eslint`), type-check (`tsc`), tests (`vitest`) y
  build (`npm run build`).

Configúralo como *required status check* en `main` para impedir fusionar un PR
si algo falla. Para ejecutarlo en local, ver
[`herramientas/README.md`](./herramientas/README.md) y
[`web/README.md`](./web/README.md).

## Despliegue

La web se despliega en **Plesk** mediante su integración con **Git**: en cada
push, Plesk hace `pull` del repo, construye la app estática y publica `web/dist`
en el document root (lo sirve el propio nginx/Apache de Plesk, sin Docker).

La acción de despliegue es [`deploy/plesk-deploy.sh`](./deploy/plesk-deploy.sh).
Pasos completos en [`DESPLIEGUE.md`](./DESPLIEGUE.md).

## Próximos pasos

- [x] Procesador de XLSX oficiales a JSON de M+J.
- [x] CI/CD para procesar automáticamente los ficheros subidos.
- [x] App web de visualización (listado + mapa de provincias y de municipios).
- [x] Despliegue automático en Plesk (Git + build en el servidor).
