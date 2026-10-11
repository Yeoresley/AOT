# Sistema Empresarial de Órdenes de Trabajo - Taller Automotriz (Rapitrans)

Este repositorio contiene una base de producción inicial para una aplicación empresarial moderna con separación de costos y facturación en USD/CUP.

- **Backend:** NestJS + Prisma + MariaDB
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Seguridad:** JWT access/refresh + RBAC granular
- **Reportes:** base lista para PDF/Excel
- **Evolución preparada para:** inventario, compras, facturación, cuentas por cobrar, aprobaciones, indicadores gerenciales y portal externo.

La solución está diseñada para evolucionar a módulos futuros sin romper el núcleo de órdenes de trabajo, usando outbox/eventos de dominio y bounded contexts.

## Documentación de diseño y arranque

Ver documento principal: `docs/solution-blueprint.md`.

## Desarrollo local

Requisitos: Node.js 18+, MariaDB 10.6+ y npm. Crea una base `rapitrans_workshop` en MariaDB y copia `backend/.env.example` como `backend/.env`; ajusta usuario, contraseña y secretos JWT. No reutilices los secretos de desarrollo en un servidor.

Desde la raíz del repositorio, instala y prepara el backend:

```powershell
cd backend
npm install
npm run prisma:deploy
cd ..
npm install
npm run seed
```

`npm run seed` crea datos de demostración y la cuenta inicial `admin` / `Admin#2026`; cambia esa contraseña antes de exponer la aplicación fuera del equipo local. Inicia el backend con `cd backend; npm run start:dev` y, en otra terminal, el frontend con `cd frontend; npm install; npm run dev`. El frontend usa `http://localhost:3000/api/v1` por defecto; se puede cambiar con `frontend/.env` a partir de `.env.example`.

El backend genera el cliente Prisma desde `../prisma/schema.prisma`. Para el servidor configura las variables de entorno, ejecuta `npm run prisma:deploy` desde `backend` y compila las aplicaciones; no copies `.env` ni `node_modules`.

Las herramientas y AFT calculan el desgaste por hora con una base de 192 horas mensuales (2 304 horas anuales): valor × depreciación anual ÷ 2 304. El inventario se controla por almacén; los ajustes de conteo físico aceptan saldo cero. La importación de datos de Versat requiere mapear primero una exportación de ejemplo.

El flujo principal permite recibir el vehículo y abrir la OT, registrar trabajos y recursos, documentar a quién se entrega al cierre, emitir una factura en USD y otra en CUP, y registrar cobros parciales o totales por separado. Los números de factura que genera la aplicación son identificadores internos; antes de producción deben ajustarse a la numeración y requisitos fiscales aplicables.
