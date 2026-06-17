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
└── .github/workflows/
    └── procesar-resultados.yml       # CI/CD: procesa los XLSX automáticamente
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

## Visualización (en construcción)

App web que mostrará los resultados de todos los procesos electorales por
comunidad autónoma, provincia y municipio, en formato listado y mapa.

## Próximos pasos

- [x] Procesador de XLSX oficiales a JSON de M+J.
- [x] CI/CD para procesar automáticamente los ficheros subidos.
- [ ] App web de visualización (listado + mapa).
