# Despliegue (Plesk + Git)

Guía para desplegar la web en un servidor con **Plesk**. La web es **estática**
(React + Vite); Plesk la sirve directamente con su nginx/Apache, así que **no
hace falta Docker**: en cada push, Plesk hace `pull` del repositorio, construye
la app y publica el resultado en el _document root_.

> Antes esto se hacía con un contenedor Docker. Para un sitio estático, Docker
> añade una capa innecesaria: Plesk ya tiene un servidor web. Por eso se ha
> sustituido por el despliegue Git nativo de Plesk.

## Qué necesitas

- Un dominio (o subdominio) en Plesk.
- La **extensión Node.js** instalada en Plesk (provee `node`/`npm` para el
  build). Plesk > Extensiones > busca "Node.js" e instálala.
- Acceso al repositorio de GitHub desde Plesk (público, o con clave de
  despliegue si es privado).

## 1. Conectar el repositorio en Plesk

En **Sitios web y dominios > (tu dominio) > Git**:

1. **Add Repository** y pega la URL del repo
   (`https://github.com/mundojusto/resultados-electorales.git`).
2. Elige la **rama** a desplegar (normalmente `main`).
3. **Modo de despliegue: Automático** — Plesk hará `pull` en cada push (usa el
   webhook que Plesk te indica; añádelo en GitHub > Settings > Webhooks si no se
   crea solo).

Plesk clonará el repo en una carpeta propia (p. ej. `~/git/resultados-...`); el
build de abajo publica los ficheros en el document root del dominio.

## 2. Acción de despliegue (build + publicar)

En la configuración de Git del dominio, abre **Acciones de despliegue
adicionales** y pon:

```bash
bash deploy/plesk-deploy.sh
```

El script [`deploy/plesk-deploy.sh`](./deploy/plesk-deploy.sh):

1. Localiza `node`/`npm` (extensión Node.js de Plesk).
2. Construye la web: `npm ci && npm run build` dentro de `web/` (esto copia los
   JSON de `resultados-oficiales-procesados/` y genera `web/dist`).
3. Sincroniza `web/dist/` al **document root** del dominio (con `rsync --delete`,
   dejándolo idéntico al build).

Por defecto publica en `~/httpdocs`. Si tu document root es otro, indícalo con la
variable `DOCROOT` en la misma acción de despliegue:

```bash
DOCROOT="$HOME/tu-dominio.com/httpdocs" bash deploy/plesk-deploy.sh
```

## 3. Cabeceras de caché (recomendado)

Para que las **elecciones nuevas** aparezcan al instante tras redeplegar y que
los assets se cacheen bien, copia las directivas de
[`deploy/nginx-adicional.conf`](./deploy/nginx-adicional.conf) en:

**Configuración de Apache y nginx > Directivas nginx adicionales**, y aplica.

## 4. Desplegar

- **Automático:** haz `push` a la rama configurada; Plesk hace `pull` y ejecuta
  la acción de despliegue.
- **Manual:** en Plesk > Git, pulsa **Deploy**.

Cuando termine, abre el dominio en el navegador.

## Actualizar datos

El pipeline de datos (subir un XLSX a `datos-oficiales/`) genera los JSON en
`resultados-oficiales-procesados/` y los commitea. Ese commit en la rama
desplegada dispara automáticamente un nuevo build en Plesk, así que **no hay
pasos manuales** para reflejar elecciones nuevas.

## Notas y resolución de problemas

- **`dirname/sort/... : command not found`** o **`npm: command not found`** en
  el log: la acción de despliegue de Plesk arranca con un PATH casi vacío. El
  script ya lo arregla anteponiendo las rutas de sistema (`/usr/bin`, etc.) y
  buscando Node en `/opt/plesk/node/*/bin`. Si aun así no encuentra `npm`, falta
  la extensión Node.js de Plesk; instálala (o si tu Node está en otra ruta,
  expórtala en la acción de despliegue: `export PATH=/ruta/a/node/bin:$PATH`).
- **HTTPS / dominio:** lo gestiona Plesk (Let's Encrypt en un clic), no hace
  falta proxy inverso como antes.
- **Permisos:** el script publica en el document root del usuario del dominio, el
  mismo bajo el que Plesk ejecuta el despliegue, así que no requiere `sudo`.
- La web usa `base: "./"` (rutas relativas) y no tiene enrutado de cliente, por
  eso no necesita reglas `try_files`/SPA en nginx.
