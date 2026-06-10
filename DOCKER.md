# Docker — TeoNova-Vet

Stack listo para correr en local y desplegar en un servidor (VPS, cloud, etc.).

## Arquitectura

| Servicio   | Imagen              | Rol |
|-----------|---------------------|-----|
| `frontend`| Nginx + build Vite  | Sirve la SPA y hace **proxy `/api` → backend** |
| `backend` | Node 20 + NestJS    | API REST en puerto 3001 (solo red interna) |
| `db`      | MySQL 8.0           | Base de datos persistente |

En **desarrollo sin Docker**, Vite hace el proxy (`frontend/vite.config.ts`).  
En **producción / Docker**, eso lo hace **Nginx** (`docker/nginx/default.conf`).

El frontend siempre llama a `baseURL: '/api'` — no hace falta URL absoluta del backend.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) o Docker Engine + Compose v2
- Puertos libres: **80** (web) y opcional **3307** (MySQL desde el host)

## Primer arranque

```powershell
# 1. Variables de entorno
copy .env.docker.example .env.docker
# Edita .env.docker: JWT_SECRET, contraseñas MySQL

# 2. Construir y levantar
docker compose --env-file .env.docker up -d --build

# 3. Contraseñas de usuarios demo (solo la primera vez)
docker compose --env-file .env.docker --profile setup run --rm setup-admin
```

Abre **http://localhost**

| Usuario | Contraseña |
|---------|------------|
| `admin@mrmax.com` | `Admin1234!` |
| `superadmin@vetpos.com` | `SuperAdmin2024!` |

## Comandos útiles

```powershell
# Ver logs
docker compose --env-file .env.docker logs -f

# Solo API
docker compose --env-file .env.docker logs -f backend

# Parar
docker compose --env-file .env.docker down

# Parar y borrar BD (¡cuidado!)
docker compose --env-file .env.docker down -v
```

## Desarrollo híbrido (solo BD en Docker)

```powershell
docker compose --env-file .env.docker up -d db

# backend/.env → DB_HOST=localhost, DB_PORT=3307
cd backend && npm run dev

# otra terminal
cd frontend && npm run dev
```

## Despliegue en servidor

1. Clona el repo y configura `.env.docker` con secretos fuertes.
2. `CORS_ORIGINS=https://tudominio.com`
3. `docker compose --env-file .env.docker up -d --build`
4. Ejecuta `setup-admin` una vez si la BD es nueva.
5. Delante de Nginx puedes poner otro proxy con TLS (Let's Encrypt / Certbot).

### Variables importantes en producción

- `JWT_SECRET` — cadena larga aleatoria (obligatorio cambiar)
- `MYSQL_ROOT_PASSWORD` / `DB_PASSWORD`
- `CORS_ORIGINS` — URL pública exacta del frontend
- `HTTP_PORT` — si el 80 está ocupado, ej. `8080:80`

## Estructura de archivos Docker

```
docker/
  nginx/default.conf     # Proxy /api + SPA
frontend/Dockerfile      # build Vite + Nginx
backend/Dockerfile       # build NestJS
docker-compose.yml
.env.docker.example
database/
  schema_v2.sql          # Init BD (primera vez)
  docker-init/02-patches.sql
```

## Solución de problemas

**`setup-admin` falla** — Espera a que MySQL esté healthy: `docker compose ps`.  
**502 en /api** — Revisa logs del backend: `docker compose logs backend`.  
**BD vacía tras `down -v`** — Vuelve a correr `up` y `setup-admin`.  
**Puerto 80 en uso** — En `.env.docker`: `HTTP_PORT=8080` y abre http://localhost:8080
