# 🚐 TransporteApp — Boletería y Encomiendas Interprovinciales

Sistema web de escritorio para automatizar el **transporte interprovincial de pasajeros** (camionetas de 7 asientos + asiento 8 por sobrecupo) y el **servicio de encomiendas**, con cobro por **QR bancario**, notificaciones por **WhatsApp**, **cierre de caja** y trazabilidad completa.

## Módulos

| Módulo | Qué hace |
|---|---|
| **Turnos y salidas** | Programa viajes (camioneta + ruta + hora), cola virtual por sucursal, switch del **asiento 8**, ciclo `Programado → En Trayecto → Finalizado / Cancelado`, **manifiesto PDF** y envío al WhatsApp del chofer. |
| **Boletería** | Mapa interactivo (verde libre / gris ocupado / azul seleccionado), datos del pasajero, cobro Efectivo o QR, boleto térmico 58/80 mm, mover/anular boletos (soft delete). **Anti-overbooking** (bloqueo por fila + índice único parcial) y actualización en tiempo real entre operadoras. |
| **Encomiendas** | Registro con remitente/destinatario, guía única `ENC-AAAA-NNNN`, etiqueta con QR, cobro **Pagado en origen** o **Contra entrega**, asignación a salida, seguimiento de estados. |
| **Entrega en destino** | Búsqueda por escaneo de QR (pistola USB/cámara), CI o teléfono; **obliga a cobrar antes de entregar** si es contra entrega. |
| **Pagos QR** | Generación del QR en pantalla, **webhook firmado (HMAC-SHA256)** y confirmación automática por WebSocket sin recargar. Proveedor `mock` para pruebas y adaptador HTTP para su banco. |
| **WhatsApp** | 3 eventos de encomienda (salió / lista para retiro / entregada) + confirmación de pasaje, mediante **cola BullMQ + Redis** con reintentos. Proveedores: Meta Cloud API, Evolution API o `log`. |
| **Cierre de caja** | Totales de efectivo vs QR (pasajes y encomiendas), desglose por salida con marca de sobrecupo, **congelamiento** de transacciones y reporte imprimible. |
| **Auditoría** | `created_at/by`, `updated_at/by` en tablas operativas y `deleted_at` (soft delete) en pasajeros. |

## Stack

- **Backend:** NestJS 11 · TypeORM · PostgreSQL · JWT · BullMQ/Redis · Socket.IO · pdfkit · qrcode
- **Frontend:** Vue 3 · Vite · TypeScript · Pinia · Vue Router · Tailwind CSS 4 · socket.io-client
- **Infra:** Docker Compose · Nginx · Certbot

```
app-transport-main/
├── backend-transport/    API REST + WebSocket (NestJS)
├── frontend-transport/   SPA (Vue 3)
├── deploy/nginx-host.conf  Nginx del VPS (proxy + SSL)
├── docker-compose.yml
└── .env.example
```

## Inicio rápido (desarrollo)

Requisitos: Node 22+, Docker.

```bash
# 1) Base de datos y Redis
docker compose up -d db redis

# 2) Backend  → http://localhost:3000/api
cd backend-transport
cp .env.example .env
npm install
npm run start:dev

# 3) Frontend → http://localhost:5173  (en otra terminal)
cd frontend-transport
npm install
npm run dev
```

Con `SEED_DEMO_DATA=true` se crean:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin123!` | Administrador |
| `secretaria` | `Secre123!` | Secretaria |

> ⚠️ Cambie las contraseñas desde **Mi cuenta** y defina un `JWT_SECRET` propio antes de producción.

**Probar el pago QR sin banco:** con `PAYMENT_PROVIDER=mock`, en el modal del QR aparece el botón **«Simular pago»**, que dispara la misma confirmación que enviaría el banco.

> Importante: la columna `Origen` de una **Ruta** debe coincidir exactamente con la `oficina_sucursal` de las secretarias; así la cola de turnos se filtra por sucursal.

## Despliegue con Docker Compose

```bash
cp .env.example .env     # edite claves, dominio, proveedores
docker compose up -d --build
# App disponible en http://SERVIDOR:8080
```

### VPS Ubuntu + Nginx + HTTPS

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo cp deploy/nginx-host.conf /etc/nginx/sites-available/transporte   # edite el dominio
sudo ln -s /etc/nginx/sites-available/transporte /etc/nginx/sites-enabled/
# agregue el bloque "map" indicado al final del archivo en /etc/nginx/conf.d/websocket.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d transporte.midominio.com
```

Producción: ponga `DB_SYNCHRONIZE=false` y gestione el esquema con migraciones de TypeORM (la sincronización automática es solo para desarrollo).

## Integración de pagos QR

1. Configure `PAYMENT_PROVIDER=http`, `PAYMENT_API_URL`, `PAYMENT_API_KEY` y `PAYMENT_WEBHOOK_SECRET`.
2. Cada banco/agregador (Pago Simple, BNB, Banco Unión, Banco Ganadero…) tiene su propio contrato. Adapte **solo** `backend-transport/src/pagos-qr/providers/http.provider.ts` (`generar` y `parsearWebhook`).
3. Registre en el banco la URL del webhook: `POST https://su-dominio/api/pagos-qr/webhook`. El body debe venir firmado con HMAC-SHA256 en el header `x-signature` (hex, con o sin prefijo `sha256=`).
4. El sistema valida firma, monto y evita reutilizar un mismo pago en dos ventas.

## WhatsApp

| `WHATSAPP_PROVIDER` | Requiere |
|---|---|
| `log` | Nada (imprime en consola; ideal en desarrollo) |
| `meta` | `WHATSAPP_META_PHONE_ID`, `WHATSAPP_META_TOKEN` |
| `evolution` | `WHATSAPP_EVOLUTION_URL`, `_INSTANCE`, `_APIKEY` |

Los mensajes se encolan en Redis y un worker los envía con 5 reintentos (backoff exponencial). El administrador puede revisar y **reintentar** envíos fallidos en *WhatsApp*.
Nota Meta Cloud API: los mensajes iniciados por la empresa fuera de la ventana de 24 h exigen **plantillas aprobadas**; si los usa, adapte `whatsapp.provider.ts` para enviar `type: "template"`.

## Flujo de encomiendas

`En Oficina Origen` → (salida **inicia viaje**) → `En Carga/Viaje` + WhatsApp al remitente → (salida **finaliza** o «Listo en destino») → `Listo en Oficina Destino` + WhatsApp al destinatario → **Entrega** (cobra si es contra entrega) → `Entregado` + WhatsApp al remitente.

## Seguridad y reglas clave

- JWT con rol (`Secretaria` / `Administrador`); contraseñas con bcrypt; rate limit en login; `helmet`.
- Administración (camionetas, rutas, usuarios, WhatsApp) solo para administradores.
- Un asiento no puede venderse dos veces: bloqueo transaccional de la salida + `UNIQUE (salida_id, numero_asiento) WHERE deleted_at IS NULL`.
- Asiento 8 solo si la camioneta lo permite **y** el turno lo habilita; no se puede deshabilitar con el asiento 8 vendido.
- Tras **Cerrar caja**, los pasajes y cobros incluidos quedan congelados (no se editan ni anulan).

## API (resumen)

Prefijo `/api`. Todas requieren `Authorization: Bearer <token>` salvo `POST /auth/login` y el webhook.

| Recurso | Endpoints principales |
|---|---|
| Auth | `POST /auth/login` · `GET /auth/me` · `PATCH /auth/password` |
| Usuarios (admin) | `GET/POST /usuarios` · `PATCH /usuarios/:id` |
| Rutas / Camionetas | `GET/POST/PATCH /rutas` · `/camionetas` (escritura: admin) |
| Salidas | `GET /salidas` · `GET /salidas/cola` · `GET /salidas/:id/asientos` · `POST/PATCH /salidas` · `PATCH /salidas/:id/estado` · `GET /salidas/:id/manifiesto` · `POST /salidas/:id/manifiesto/whatsapp` |
| Pasajeros | `GET/POST /pasajeros` · `PATCH/DELETE /pasajeros/:id` · `GET /pasajeros/:id/ticket/escpos` |
| Encomiendas | `GET/POST /encomiendas` · `GET /encomiendas/buscar?q=` · `POST /:id/asignar-salida` · `/cobrar` · `/marcar-listo` · `/entregar` · `GET /:id/etiqueta/escpos` |
| Pagos QR | `POST /pagos-qr` · `GET /pagos-qr/:id` · `POST /pagos-qr/webhook` · `POST /pagos-qr/:id/simular` (solo mock) |
| Caja | `GET /caja/resumen` · `POST /caja/cerrar` · `GET /caja/historial` |
| Otros | `GET /dashboard` · `GET /notificaciones` (admin) |

Eventos Socket.IO: `pago:actualizado`, `salida:asientos`, `encomienda:actualizada`.

## Impresión térmica

- **Web (por defecto):** boleto y etiqueta se imprimen con el diálogo del navegador en papel de 58 u 80 mm (selector en Boletería). Para impresión directa sin diálogo, inicie Chrome/Edge con `--kiosk-printing`.
- **ESC/POS:** los endpoints `.../ticket/escpos` y `.../etiqueta/escpos` devuelven los bytes crudos listos para enviar a la impresora (agente local, WebUSB o red).

## Pruebas y calidad

```bash
cd backend-transport && npm run build
cd frontend-transport && npm run type-check && npm run build-only
```

## Modelo de datos

`usuarios` · `rutas` · `camionetas` · `salidas` · `pasajeros` · `encomiendas` · `pagos_qr` · `cierres_caja` · `notificaciones`.
Respecto al diseño original se agregaron: `rutas` (referenciada en el diagrama), `cierres_caja`, `notificaciones`, y columnas de apoyo (`parada_destino`, `cierre_caja_id`, `pagado/pagado_by`, bultos/peso/CI en encomiendas, `chofer_telefono`, `utilizado` en `pagos_qr`).
