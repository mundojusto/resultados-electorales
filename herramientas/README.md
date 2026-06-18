# Herramientas

## `procesar_resultados.py`

Procesa un fichero XLSX oficial (votos por municipio en Congreso, Senado,
Europeas o Cabildos) y extrae **únicamente los resultados del partido M+J**
(Por Un Mundo Más Justo / PUM+J / MUNDO+JUSTO), guardando un JSON en
[`resultados-oficiales-procesados/`](../resultados-oficiales-procesados).

### Uso local

```bash
pip install -r herramientas/requirements.txt

python herramientas/procesar_resultados.py datos-oficiales/fichero.xlsx \
    --salida resultados-oficiales-procesados \
    --borrar-entrada
```

Opciones:

- `--salida DIR` — directorio de salida (por defecto `resultados-oficiales-procesados`).
- `--borrar-entrada` — borra el XLSX tras procesarlo correctamente.

### Cómo localiza al partido

La columna de M+J se detecta por contenido (no por posición, que varía entre
elecciones). Se normaliza el texto (mayúsculas, sin acentos) y se busca:

- En el **nombre completo**: `POR UN MUNDO MAS JUSTO`, `MUNDO MAS JUSTO`, `MUNDO+JUSTO`.
- En las **siglas**: `PUM+J`, `M+J`, `PUMJ`.

Si cambian las siglas en algún proceso, basta con ampliar las listas
`PATRONES_NOMBRE` / `PATRONES_SIGLAS` al inicio del script.

### Formato del JSON de salida

```jsonc
{
  "eleccion": { "tipo": "Congreso", "periodo": "Julio 2023", "anio": 2023, "mes": 7, ... },
  "partido":  { "nombre": "POR UN MUNDO MÁS JUSTO", "siglas": "PUM+J" },
  "totales":  { "votos_partido": 22344, "votos_validos": 24483438, "porcentaje_validos": 0.0913, "municipios": 8131 },
  "resultados": [
    {
      "comunidad": "Andalucía",
      "codigo_provincia": 4, "provincia": "Almería",
      "codigo_municipio": 3, "municipio": "Adra",
      "codigo_ine": "04003",
      "censo": 17557, "votantes": 11748,
      "votos_validos": 11623, "votos_candidaturas": 11551,
      "votos_partido": 11
    }
  ]
}
```

El `codigo_ine` (provincia 2 dígitos + municipio 3 dígitos) permite cruzar los
datos con los contornos GeoJSON para el mapa.

### Automatización (CI/CD)

El workflow [`.github/workflows/procesar-resultados.yml`](../.github/workflows/procesar-resultados.yml)
se ejecuta automáticamente al subir un `.xlsx` a `datos-oficiales/`: lo procesa,
guarda el JSON en `resultados-oficiales-procesados/`, borra el XLSX original y
commitea los cambios de vuelta a la rama.

## `validar_datos.py`

Valida los JSON ya procesados y su coherencia con los GeoJSON del mapa
(esquema, totales que cuadran, `codigo_ine` correcto y único, provincias en
rango, y que cada provincia con datos tenga su GeoJSON de municipios). Se
ejecuta en CI y también puede usarse en local:

```bash
python herramientas/validar_datos.py
```

## Tests y lint

```bash
pip install -r herramientas/requirements-dev.txt

pytest             # tests del procesador (herramientas/tests/)
ruff check .       # lint
```

Estas comprobaciones (más las de la web) se ejecutan en cada Pull Request
mediante [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
