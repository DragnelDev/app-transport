# Frontend — TransporteApp (Vue 3 + Vite + Tailwind)

```bash
npm install
npm run dev            # http://localhost:5173 (proxy /api y /socket.io → localhost:3000)
npm run type-check
npm run build-only
```

Variables opcionales en `.env.example` (`VITE_API_URL`, `VITE_WS_URL`, `VITE_PROXY_TARGET`).
Documentación completa: ver el [README principal](../README.md).

Estructura: `src/views` (pantallas), `src/components` (SeatMap, QrPaymentModal…), `src/stores` (Pinia), `src/api` (axios + socket), `src/utils` (formato e impresión térmica).
