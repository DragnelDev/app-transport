# Backend — TransporteApp (NestJS)

API REST + WebSocket para boletería, encomiendas, pagos QR, WhatsApp y cierre de caja.

```bash
cp .env.example .env
npm install
npm run start:dev      # http://localhost:3000/api
npm run build && npm run start:prod
```

Requiere PostgreSQL y Redis (`docker compose up -d db redis` desde la raíz).
Documentación completa, variables de entorno y despliegue: ver el [README principal](../README.md).

Estructura: `src/<modulo>/{entity,dto,service,controller,module}` — módulos `auth`, `usuarios`, `rutas`, `camionetas`, `salidas`, `pasajeros`, `encomiendas`, `pagos-qr`, `notificaciones`, `caja`, `dashboard`, `events`, `seed`.
