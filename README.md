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
└── .github/workflows/
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

## Despliegue

Para desplegar en un servidor privado con **Docker + nginx** (sin dominio,
accediendo por IP:puerto), sigue [`DESPLIEGUE.md`](./DESPLIEGUE.md). En resumen:

```bash
git clone https://github.com/mundojusto/resultados-electorales.git
cd resultados-electorales
docker compose up -d --build      # luego: http://IP-DEL-SERVIDOR:8080
```

## Próximos pasos

- [x] Procesador de XLSX oficiales a JSON de M+J.
- [x] CI/CD para procesar automáticamente los ficheros subidos.
- [x] App web de visualización (listado + mapa de provincias y de municipios).
- [x] Despliegue con Docker para servidor privado.
- [ ] (Opcional) Dominio y HTTPS mediante proxy inverso.
