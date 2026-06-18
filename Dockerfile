# Despliegue de la web (Docker + nginx, multi-etapa).
# El build de la app ocurre dentro del contenedor: el servidor solo necesita Docker.
# El contexto de build debe ser la RAÍZ del repo (el build usa
# resultados-oficiales-procesados/, que está fuera de web/).

# --- Etapa 1: build de la app (Node) ---
FROM node:20-alpine AS build
WORKDIR /app

# Dependencias primero (capa cacheable)
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

# Código de la web + datos procesados (los necesita scripts/copiar-datos.mjs)
COPY web/ ./web/
COPY resultados-oficiales-procesados/ ./resultados-oficiales-procesados/
RUN cd web && npm run build

# --- Etapa 2: servir los estáticos con nginx ---
FROM nginx:alpine AS serve
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
