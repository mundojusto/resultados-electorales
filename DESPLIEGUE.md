# Despliegue (Docker + nginx)

Guía para desplegar la web en un servidor privado, **sin dominio**, accediendo
por IP y puerto (p. ej. `http://192.168.1.50:8080`). El build ocurre dentro del
contenedor, así que el servidor **solo necesita Docker** (ni Node ni nginx).

## Qué necesitas

- Acceso SSH al servidor con permisos `sudo`.
- Conexión a internet en el servidor (para descargar Docker e imágenes base).
- Un puerto libre accesible (por defecto **8080**).
- La IP del servidor (averíguala con `hostname -I` o `ip a`).

## 1. Instalar Docker (si no lo tiene)

En Debian/Ubuntu:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # para usar docker sin sudo
# cierra sesión y vuelve a entrar (o ejecuta: newgrp docker)
```

Comprueba: `docker version` y `docker compose version`.

## 2. Clonar el repositorio

```bash
git clone https://github.com/mundojusto/resultados-electorales.git
cd resultados-electorales
# Mientras los cambios estén en la rama de trabajo (antes de fusionar a main):
git checkout claude/zealous-cray-2dnjla
```

## 3. Construir y arrancar

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (descarga imágenes y construye la web).
Cuando termine, el contenedor `resultados-mj` queda corriendo en segundo plano.

## 4. Abrir el puerto (si hay cortafuegos)

```bash
sudo ufw allow 8080/tcp     # solo si usas ufw
```

Si el servidor está tras un router/NAT y quieres acceder desde fuera de la red
local, redirige el puerto 8080 en el router hacia el servidor.

## 5. Acceder

Abre en el navegador:

```
http://IP-DEL-SERVIDOR:8080
```

## Operaciones habituales

| Acción | Comando |
| --- | --- |
| Ver estado | `docker compose ps` |
| Ver logs | `docker compose logs -f` |
| Parar | `docker compose down` |
| Reiniciar | `docker compose restart` |
| **Actualizar** (tras subir datos o cambios) | `git pull && docker compose up -d --build` |

## Cambiar el puerto

Edita `docker-compose.yml`, línea `ports`, y cambia el `8080` de la izquierda
(host). Por ejemplo, para servir en el puerto 80:

```yaml
    ports:
      - "80:80"
```

Luego `docker compose up -d --build`.

## Notas

- La web es **estática**; `base: "./"` en Vite hace que funcione en cualquier IP
  o subruta sin configurar nada.
- Los datos mostrados son los JSON de `resultados-oficiales-procesados/` en el
  momento del build. Para reflejar datos nuevos, vuelve a construir (paso de
  *Actualizar*).
- nginx sirve los datos (`/datos/`, incluido `index.json`) con `Cache-Control:
  no-cache`, de modo que el navegador siempre revalida y coge las elecciones
  nuevas tras redeplegar. Si visitaste la web **antes** de este cambio, puede que
  tu navegador aún conserve la versión antigua cacheada: fuerza una recarga
  completa (Ctrl+F5 / Cmd+Shift+R) una vez.
- Para HTTPS o un dominio más adelante, lo habitual es poner delante un proxy
  (Caddy o nginx con certificado); se puede añadir cuando haga falta.
