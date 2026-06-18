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
