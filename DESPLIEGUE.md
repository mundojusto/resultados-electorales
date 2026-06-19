# Despliegue (Plesk sirviendo una rama ya compilada)

La web es **estática** (React + Vite). El despliegue tiene dos partes:

1. **GitHub Actions construye** la web (tiene Node) y publica el resultado YA
   COMPILADO en la rama **`plesk-deploy`**.
2. **Plesk sigue esa rama y sirve los ficheros tal cual** con su nginx/Apache.
   No construye nada y **no necesita Node ni Docker**.

> **¿Por qué así?** El entorno donde Plesk ejecuta las acciones de despliegue
> está aislado (jaula/usuario restringido) y **no tiene acceso a Node**, aunque
> esté instalado en el servidor. Por eso no se construye en el servidor: se
> construye en GitHub Actions y Plesk solo copia el resultado.

## Cómo funciona

```
push a main / datos nuevos
        │
        ▼
GitHub Actions  ── npm run build ──▶  rama plesk-deploy (solo web compilada)
                                              │
                                              ▼
                                   Plesk (pull) ──▶ document root ──▶ navegador
```

El workflow es
[`.github/workflows/publicar-plesk.yml`](./.github/workflows/publicar-plesk.yml)
y se dispara cuando:

- se hace push a `main` tocando `web/**` o `resultados-oficiales-procesados/**`
  (p. ej. al fusionar un PR);
- termina el workflow de **Procesar resultados oficiales** (los commits de datos
  los hace el bot y no disparan `push`, por eso se encadena con `workflow_run`);
- se lanza a mano (**Actions > Publicar web en Plesk > Run workflow**).

La rama `plesk-deploy` es **gestionada automáticamente** (un único commit con la
web compilada); no la edites a mano.

## Puesta en marcha (una sola vez)

### 1. Generar la rama `plesk-deploy`

Lanza el workflow una vez para que cree la rama:

- **Actions > Publicar web en Plesk > Run workflow** (sobre `main`), o
- haz cualquier push a `main` que toque `web/`.

Comprueba que aparece la rama `plesk-deploy` en GitHub con los ficheros
compilados (`index.html`, `assets/`, `datos/`, `geo/`…).

### 2. Conectar Plesk a esa rama

En **Sitios web y dominios > (tu dominio) > Git**:

1. **Add Repository** con la URL del repo
   (`https://github.com/mundojusto/resultados-electorales.git`).
2. **Rama a desplegar: `plesk-deploy`** (¡no `main`!).
3. **Ruta de despliegue:** el _document root_ del dominio (normalmente
   `httpdocs`), para que Plesk coloque ahí los ficheros.
4. **NO** configures ninguna "acción de despliegue adicional": no hay que
   construir nada, Plesk solo copia ficheros.
5. **Modo de despliegue: Automático** (usa el webhook que indica Plesk; añádelo
   en GitHub > Settings > Webhooks si no se crea solo).

### 3. Cabeceras de caché (recomendado)

Copia las directivas de
[`deploy/nginx-adicional.conf`](./deploy/nginx-adicional.conf) en
**Configuración de Apache y nginx > Directivas nginx adicionales** y aplica.
Sirven para que las elecciones nuevas aparezcan al instante y los assets se
cacheen bien.

## Desplegar y actualizar

No hay pasos manuales en el día a día:

- **Cambios en la web** → fusiona a `main` → GitHub Actions reconstruye y
  actualiza `plesk-deploy` → Plesk hace pull y publica.
- **Datos nuevos** → sube el XLSX a `datos-oficiales/`; el procesado genera el
  JSON, y al terminar se reconstruye y publica automáticamente.

Para forzar una publicación manual: **Actions > Publicar web en Plesk > Run
workflow**. En Plesk también puedes pulsar **Deploy** para forzar un pull.

## Certificado SSL / HTTPS

El certificado **no se gestiona desde este repositorio** (la web es estática y
la sirve el propio nginx/Apache de Plesk), sino desde el panel de Plesk, que
incluye **Let's Encrypt gratis e integrado** y lo **renueva automáticamente**
cada ~90 días.

### Requisitos previos

Antes de emitir el certificado, asegúrate de que:

- El **DNS del dominio apunta a la IP del servidor Plesk** y está propagado
  (Let's Encrypt valida el dominio por HTTP/DNS).
- Los puertos **80 y 443 están abiertos** en el firewall.
- El dominio **resuelve correctamente** en el navegador antes de pedirlo.

### Emitir el certificado

En **Sitios web y dominios > (tu dominio)**:

1. Abre **SSL/TLS Certificates** ("Certificados SSL/TLS").
2. En la sección de Let's Encrypt, pulsa **Install / Obtener gratis**.
3. Marca las casillas recomendadas:
   - **Incluir el dominio `www`** (cubre `www.tudominio.com` además de
     `tudominio.com`).
   - **Proteger el webmail** si lo usas.
4. Introduce el email de contacto y pulsa **Obtener**.

Plesk valida el dominio, emite el certificado y lo asigna al sitio.

### Forzar HTTPS (quitar el aviso de inseguridad)

Tener el certificado instalado no basta si el navegador sigue cargando la web
por `http://`. Para que el aviso de inseguridad desaparezca del todo:

1. En **Hosting y DNS > Configuración de hosting** (o en la propia pantalla de
   SSL/TLS), activa la **redirección permanente (301) de HTTP a HTTPS**.
2. Recomendado: activa **HSTS** en la pantalla de SSL/TLS para que el navegador
   exija siempre HTTPS.

## Notas y resolución de problemas

- **La rama `plesk-deploy` no aparece:** ejecuta el workflow al menos una vez
  (paso 1). Revisa el log en la pestaña **Actions**.
- **Plesk no actualiza solo:** revisa que el webhook de GitHub apunta a Plesk y
  que el modo de despliegue es Automático. Como alternativa, pulsa **Deploy** en
  Plesk.
- **HTTPS / dominio:** lo gestiona Plesk (Let's Encrypt). Ver la sección
  [Certificado SSL / HTTPS](#certificado-ssl--https).
- La web usa `base: "./"` (rutas relativas) y no tiene enrutado de cliente, así
  que funciona servida en la raíz del dominio sin reglas extra de nginx.
