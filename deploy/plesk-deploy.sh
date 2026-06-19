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

# --- Configuración -----------------------------------------------------------
# Document root del dominio (donde nginx/Apache de Plesk sirve los ficheros).
# Por defecto httpdocs del usuario del dominio; sobreescribible con $DOCROOT.
DOCROOT="${DOCROOT:-$HOME/httpdocs}"

# Carpeta del repo donde vive la app (relativa a la raíz del repositorio).
WEB_DIR="web"

# --- Ir a la raíz del repositorio -------------------------------------------
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
echo "Repositorio: $REPO_ROOT"
echo "Document root: $DOCROOT"

# --- Localizar Node/npm ------------------------------------------------------
# La extensión Node.js de Plesk instala Node en /opt/plesk/node/<version>/bin,
# que puede NO estar en el PATH de la acción de despliegue. Si npm no aparece,
# usamos la versión más reciente que encontremos.
if ! command -v npm >/dev/null 2>&1; then
  NODE_BIN="$(ls -d /opt/plesk/node/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "${NODE_BIN:-}" ]; then
    export PATH="$NODE_BIN:$PATH"
  fi
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: no se encontró npm. Instala la extensión Node.js de Plesk o" \
       "ajusta el PATH al binario de Node." >&2
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
