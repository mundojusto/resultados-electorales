#!/usr/bin/env bash
# Genera los contornos GeoJSON de municipios por provincia en
# public/geo/municipios/<CPRO>.json (uno por provincia, código INE de 2 díg.).
#
# Fuente: secciones censales del INE (2019) publicadas por
#   https://github.com/miguel-angel-monjas/spain-datasets
# Se disuelven las secciones por municipio (CUMUN), se simplifican y se
# dividen por provincia. Solo hay que reejecutarlo si cambian los límites
# municipales; los ficheros resultantes se versionan en el repositorio.
#
# Requisitos: bash, curl y mapshaper (npm install -g mapshaper).
set -euo pipefail

BASE="https://raw.githubusercontent.com/miguel-angel-monjas/spain-datasets/master/data/census"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/geo/municipios"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
CCAA="AN AR AS CB CE CL CM CN CT EX GA IB MC MD ML NC PV RI VC"

for c in $CCAA; do
  f="$TMP/secc_${c}.json"
  echo ">> $c"
  curl -sSL -o "$f" "${BASE}/SECC_CE_ES-${c}_20190101.json"
  mapshaper "$f" \
    -dissolve CUMUN copy-fields=NMUN,CPRO \
    -simplify 4% keep-shapes \
    -split CPRO \
    -o format=geojson precision=0.0001 "$OUT"
  rm -f "$f"
done

echo "Hecho. Ficheros en $OUT"
