#!/usr/bin/env bash
# Acción de despliegue de Plesk para la web de resultados M+J.
#
# Plesk ejecuta este script tras cada "pull" del repositorio (al hacer push a la
# rama configurada). Construye la web estática y publica web/dist en el document
# root del dominio, que es lo que sirve nginx/Apache de Plesk. No hace falta
# Docker: el servidor solo necesita Node (extensión Node.js de Plesk).
#
# Cómo configurarlo en Plesk:
#   Sitios web y dominios > (tu dominio) > Git
#     - Conecta este repositorio y elige la rama (p. ej. main).
#     - Modo de despliegue: Automático (en cada push).
#     - Acciones de despliegue adicionales:
#         bash deploy/plesk-deploy.sh
#
# Si tu document root NO es ~/httpdocs, define la variable DOCROOT en la propia
# acción de despliegue, por ejemplo:
#         DOCROOT="$HOME/mi-dominio.com/httpdocs" bash deploy/plesk-deploy.sh

set -euo pipefail

# --- PATH básico -------------------------------------------------------------
# La acción de despliegue de Plesk arranca con un PATH casi vacío, así que ni
# siquiera utilidades estándar (dirname, sort, find, cp, rsync...) están
# disponibles. Anteponemos las rutas de sistema habituales para tenerlas.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

# --- Configuración -----------------------------------------------------------
# Document root del dominio (donde nginx/Apache de Plesk sirve los ficheros).
# Por defecto httpdocs del usuario del dominio; sobreescribible con $DOCROOT.
DOCROOT="${DOCROOT:-$HOME/httpdocs}"

# Carpeta del repo donde vive la app (relativa a la raíz del repositorio).
WEB_DIR="web"

# --- Ir a la raíz del repositorio -------------------------------------------
# Sin depender de 'dirname': usamos expansión de bash. Si $0 no trae ruta
# (se ejecutó desde la raíz del repo), nos quedamos donde estamos.
SCRIPT_DIR="${0%/*}"
[ "$SCRIPT_DIR" = "$0" ] && SCRIPT_DIR="."
cd "$SCRIPT_DIR/.."
REPO_ROOT="$(pwd)"
echo "Repositorio: $REPO_ROOT"
echo "Document root: $DOCROOT"

# --- Localizar Node/npm ------------------------------------------------------
# La extensión Node.js de Plesk instala Node en /opt/plesk/node/<version>/bin,
# que puede NO estar en el PATH. Detectamos por 'node' (siempre presente) y
# añadimos su bin al PATH; el glob va ordenado, así que la última coincidencia
# (versión más alta) queda primera en el PATH.
if ! command -v node >/dev/null 2>&1; then
  for node_bin in \
    /opt/plesk/node/*/bin \
    /usr/local/bin \
    "$HOME/.nvm/versions/node/"*/bin; do
    [ -x "$node_bin/node" ] && PATH="$node_bin:$PATH"
  done
  export PATH
fi

# Con node en el PATH, npm suele estar al lado. Si no (symlink ausente en
# algunas instalaciones de Plesk), lo invocamos vía npm-cli.js, que vive en
# <node>/../lib/node_modules/npm/bin/npm-cli.js.
if command -v node >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  node_path="$(command -v node)"
  npm_cli="${node_path%/bin/node}/lib/node_modules/npm/bin/npm-cli.js"
  if [ -f "$npm_cli" ]; then
    npm() { node "$npm_cli" "$@"; }
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: no se encontró npm en el servidor." >&2
  echo "--- Diagnóstico (compártelo si pides ayuda) -----------------------" >&2
  echo "PATH actual: $PATH" >&2
  if [ -d /opt/plesk/node ]; then
    echo "Versiones de Node de Plesk instaladas (/opt/plesk/node):" >&2
    ls -1 /opt/plesk/node 2>/dev/null >&2 || true
  else
    echo "No existe /opt/plesk/node: la extensión Node.js de Plesk NO está" \
         "instalada. Instálala en Plesk > Extensiones > 'Node.js'." >&2
  fi
  echo "Búsqueda de binarios 'npm' en el sistema:" >&2
  find /opt /usr "$HOME" -name npm -type f 2>/dev/null | head -n 10 >&2 || true
  echo "------------------------------------------------------------------" >&2
  echo "Si 'npm' aparece arriba en una ruta no contemplada, añádela en la" \
       "acción de despliegue: export PATH=/esa/ruta:\$PATH" >&2
  exit 1
fi
echo "Usando Node $(node -v) / npm $(npm -v)"

# --- Build -------------------------------------------------------------------
# 'npm run build' ejecuta scripts/copiar-datos.mjs (que lee
# resultados-oficiales-procesados/, fuera de web/) y luego 'vite build'.
cd "$REPO_ROOT/$WEB_DIR"
npm ci
npm run build
cd "$REPO_ROOT"

# --- Publicar en el document root -------------------------------------------
mkdir -p "$DOCROOT"
if command -v rsync >/dev/null 2>&1; then
  # --delete deja el document root EXACTAMENTE igual que dist (borra lo viejo).
  rsync -a --delete "$WEB_DIR/dist/" "$DOCROOT/"
else
  # Fallback sin rsync: vaciar y copiar.
  find "$DOCROOT" -mindepth 1 -delete
  cp -a "$WEB_DIR/dist/." "$DOCROOT/"
fi

echo "Despliegue completado en: $DOCROOT"
