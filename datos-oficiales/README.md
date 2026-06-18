# Datos oficiales (entrada)

Sube aquí los ficheros **XLSX oficiales** con los votos por municipio
(Congreso, Senado, Europeas o Cabildos).

Al subir un `.xlsx`, el workflow
[`procesar-resultados.yml`](../.github/workflows/procesar-resultados.yml) lo
procesa automáticamente: genera el JSON de M+J en
[`resultados-oficiales-procesados/`](../resultados-oficiales-procesados),
**borra el XLSX original** y commitea los cambios.

> Nota: los XLSX no se conservan en el repositorio; solo se guarda el JSON
> procesado con los resultados de M+J.

## Ficheros grandes (> 25 MB)

La subida por la **web de GitHub** (botón *Add file → Upload files*) está limitada
a **25 MB por fichero**. Para XLSX mayores, usa cualquiera de estas vías:

1. **Procesar en local y subir solo el JSON** (recomendado; vale para cualquier
   tamaño y no mete el XLSX en el repositorio):

   ```bash
   pip install -r herramientas/requirements.txt
   python herramientas/procesar_resultados.py /ruta/al/fichero.xlsx \
       --salida resultados-oficiales-procesados
   git add resultados-oficiales-procesados
   git commit -m "Añadir resultados de <elección>"
   git push
   ```

2. **Lanzar el workflow con una URL** (CI descarga y procesa; el XLSX no entra en
   el repo): en GitHub, pestaña **Actions → "Procesar resultados oficiales" → Run
   workflow**, y pega la **URL directa** del XLSX oficial en el campo *url*.

3. **Subir el XLSX por línea de comandos con git** (hasta ~100 MB por fichero):
   `git add datos-oficiales/fichero.xlsx && git commit && git push`. El workflow
   lo procesará igual. (Menos recomendable: el binario queda en el historial de
   git aunque luego se borre.)

