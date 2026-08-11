# МИСМ МЧС

Платформа мониторинга и реагирования на чрезвычайные ситуации с картографией, IoT-датчиками, ролями доступа и обновлениями в реальном времени.

## Что внутри

- Backend: `Node.js + Express + Prisma + PostgreSQL + Socket.IO`
- Frontend: `React + Vite + MapLibre GL + Tailwind`
- Роли и доступ: `SUPER_ADMIN`, `ADMIN`, `MCHS_USER`, `ORG_OPERATOR`, `MAP_OPERATOR`, `HAZARD_OPERATOR`
- Карта: геопоиск, маршруты, слои погоды, 3D, трафик
- Реалтайм: события по датчикам, тревогам и инцидентам через WebSocket

## Структура

```text
MCHS-main/
  server/   # API, БД, бизнес-логика, сокеты
  client/   # веб-интерфейс оператора/админа/МЧС
```

## Основные возможности

- Управление организациями, пользователями и устройствами.
- Прием телеметрии от IoT (`/api/devices/iot/data`).
- Автоопределение статуса устройства (`ONLINE/WARNING/DANGER/OFFLINE`).
- Автосоздание инцидента при входе устройства в `DANGER`.
- Глобальная тревога МЧС для всех устройств.
- Карта объектов, датчиков, маршрутов и зон реагирования.
- Отдельный модуль водной безопасности (`water-alert`) с внешним AI-источником.

## Требования

- `Node.js >= 18`
- `PostgreSQL >= 14`
- `npm`

## Быстрый запуск

### 1) Backend

```bash
cd server
npm install
copy env.example .env
```

Заполните `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mchs_db?schema=public"
JWT_SECRET="change_me"
MAPTILER_KEY="your_maptiler_key"
PORT=5000
```

Примените миграции и (опционально) сид:

```bash
npx prisma migrate dev
npx prisma db seed
```

Запуск backend:

```bash
npm run dev
```

### 2) Frontend

```bash
cd ../client
npm install
copy env.example .env
```

Минимально для запуска:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

Для полной карты добавьте в `client/.env`:

```env
VITE_MAPTILER_KEY=...
VITE_ORS_KEY=...
VITE_TOMTOM_KEY=...
VITE_WEATHER_KEY=...
VITE_CITY_LAT=41.55
VITE_CITY_LON=60.63
```

Запуск frontend:

```bash
npm run dev
```

Откройте: `http://localhost:5173`

## Тестовые учетные данные (после `prisma db seed`)

- `super / 123` (`SUPER_ADMIN`)
- `mchs / 123` (`MCHS_USER`)
- `installer / 123` (`ADMIN`)
- `urgu / 123` (`ORG_OPERATOR`)
- `map_only / 123` (`MAP_OPERATOR`)
- `hazard_only / 123` (`HAZARD_OPERATOR`)

## API (кратко)

- `POST /api/auth/login`
- `GET|POST|PUT|DELETE /api/devices...`
- `GET|POST|PUT|DELETE /api/organizations...`
- `GET|POST|PUT|DELETE /api/users...`
- `GET /api/stats`
- `GET /api/incidents`
- `POST /api/incidents`
- `PATCH /api/incidents/:id/resolve`
- `GET /api/mchs/dashboard`
- `GET /api/mchs/global-alert/status`
- `POST /api/mchs/global-alert`
- `GET|POST /api/water-camera`
- `GET /api/geocoding/search?q=...`
- `GET|POST /api/sensor-data`

## WebSocket события

- `device-update`
- `alert`
- `global-alert`
- `water-alert`
- `sensor-update`
- `sensor-alarm`

## Скрипты

Backend (`server/package.json`):
- `npm run dev`
- `npm start`

Frontend (`client/package.json`):
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Лицензия

MIT, см. `LICENSE`.
## Latest fixes

- Removed password field from user API responses.
- Protected stats, water-camera, geocoding and sensor-data routes.
- Reworked legacy sensor endpoint to use real Device token.
- Added realtime incident-created event.
- Added manual incident creation API.
- Added offline device checker.
- Added helmet, login rate limit and CORS/Socket.IO whitelist.
- Reworked frontend API calls to include JWT.

## Phase 2 migration safety

Before changing `server/prisma/schema.prisma`, create a database backup:

```bash
pg_dump -U postgres -d mchs_db > backup_before_phase2.sql
```

Use a separate branch for Phase 2 work:

```bash
git checkout -b phase2-history-audit-incident-status
```

Apply schema changes only through Prisma migrations:

```bash
cd server
npx prisma migrate dev --name phase2_history_audit_incident_status
npx prisma validate
npx prisma generate
```
