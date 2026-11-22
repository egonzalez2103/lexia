# Jurídico

Nombre provisional. El dominio se elige después.

Panel del dueño y un espacio por despacho.

El dueño, en `/panel`, da de alta despachos, lleva recursos humanos, cajas, nóminas y reportes. Cada despacho entra con su propia cuenta y trabaja expedientes, términos, promociones y escritos en `/despacho`. La ficha pública queda en `/sitio/el-enlace`.

## Requisitos

- Node.js 20 o superior
- MySQL 8

Crea la base si todavía no existe:

```sql
CREATE DATABASE IF NOT EXISTS juridico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Primera vez

```bash
npm install --prefix backend
npm install --prefix web
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
```

`backend/.env.example` asume MySQL en `127.0.0.1:3306` con usuario `root` y sin contraseña. Si levantas MySQL con Docker, el contenedor publica el puerto `3307`:

```bash
docker compose up -d
```

y en `backend/.env` deja `DB_PORT=3307`, `DB_USER=juridico` y `DB_PASSWORD=juridico`.

## Levantar el local

En dos terminales, desde la raíz:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

La API queda en el puerto `3001` y el sitio en el puerto `3000`. Al arrancar, la API crea las tablas y, si no existe, la cuenta del dueño.

- Login: http://localhost:3000/login
- Panel del dueño: http://localhost:3000/panel
- Espacio del despacho: http://localhost:3000/despacho
- Ficha pública: http://localhost:3000/sitio/el-enlace
- Salud: http://localhost:3001/health

## Cuenta local del dueño

| Correo | Contraseña |
|---|---|
| `dueno@juridico.local` | `DuenoJuridico2026` |

Esas claves salen de `backend/.env` (`OWNER_EMAIL`, `OWNER_PASSWORD`) y solo sirven en esta máquina. Cámbialas antes de compartir un ambiente.
# juridico
