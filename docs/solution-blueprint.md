# 1) Resumen ejecutivo de la solución

Se propone una plataforma web empresarial para gestión integral de órdenes de trabajo (OT) en talleres automotrices de Rapitrans, orientada a trazabilidad completa del ciclo operativo: recepción del vehículo, ejecución técnica, consumo de recursos, cierre contable y facturación final separada por moneda USD/CUP.

La base entregada implementa arquitectura modular limpia, seguridad robusta (JWT + refresh + RBAC), modelo relacional normalizado con auditoría y estructura frontend por features para escalar sin reescrituras.

---

# 2) Arquitectura propuesta

## 2.1 Arquitectura lógica

- **Frontend SPA (React + TS):** experiencia ERP moderna con módulos por dominio.
- **API REST (NestJS):** capa de aplicación con validaciones, reglas de negocio y seguridad.
- **Persistencia (Prisma + MariaDB):** modelo relacional normalizado.
- **Infra cross-cutting:** autenticación, autorización, auditoría, manejo de errores, logging.

## 2.2 Estilo arquitectónico

- **Modular monolith (inicio):** rápido de operar y desplegar.
- **Hexagonal/light clean architecture:** separación de controladores, servicios, repositorios/ORM.
- **Preparado para microservicios:** dominios desacoplados con contratos REST claros.

## 2.3 Capas backend

1. **Presentation:** controllers + DTOs.
2. **Application:** services de caso de uso.
3. **Domain:** reglas de negocio (cálculo costos/facturación).
4. **Infrastructure:** Prisma/MariaDB, JWT, logs, storage evidencias.

---

# 3) Módulos funcionales

1. Seguridad y usuarios (auth, sesión, RBAC).
2. Maestros/codificadores (clientes, establecimientos, almacenes, etc.).
3. Órdenes de trabajo (apertura, edición, cierre, anulación, histórico).
4. Operaciones y mano de obra.
5. Insumos.
6. PPA (piezas/partes/accesorios).
7. Servicios subcontratados.
8. Costeo y facturación (USD/CUP).
9. Auditoría y trazabilidad.
10. Reportes y exportaciones.
11. Dashboard ejecutivo.

---

# 4) Modelo de datos relacional

Modelo principal:

- **Identidad:** users, roles, permissions, user_roles, role_permissions, refresh_tokens.
- **Maestros:** establishments, warehouses, clients, exchange_rates, operation_catalog, operators, machines_tools, vehicles.
- **Transaccional:** work_orders, work_order_status_history, work_order_operations, work_order_operation_workers, work_order_operation_tools, consumable_entries, ppa_entries, outsourced_service_entries.
- **Cierre contable:** work_order_cost_summary.
- **Auditoría:** audit_logs.

Decisiones:
- Soft delete con `deleted_at` en maestros y transaccionales editables.
- Índices por fecha/estado/cliente/vehículo para filtros críticos.
- Restricciones de integridad y unicidad de folio OT por establecimiento.

---

# 5) Entidades y relaciones

- `work_orders` N:1 `clients`, N:1 `establishments`, N:1 `vehicles`.
- `work_orders` 1:N `work_order_operations`.
- `work_order_operations` N:M `operators` (tabla pivote con tarifa y horas efectivas).
- `work_order_operations` N:M `machines_tools` (tabla pivote con THD aplicado y horas).
- `work_orders` 1:N `consumable_entries`, `ppa_entries`, `outsourced_service_entries`.
- `work_orders` 1:1 `work_order_cost_summary` (snapshot al cierre).
- `work_orders` 1:N `work_order_status_history`.
- `users` 1:N `audit_logs`.

---

# 6) Reglas de negocio

## 6.1 Apertura

- No cerrar OT sin datos mínimos: establecimiento, cliente, vehículo, entrega/recibe, actividad solicitada.
- Registrar estado inicial e incidencias visibles obligatoriamente.

## 6.2 Operaciones

- Cada operación requiere >= 1 operario.
- Tiempo válido > 0.
- Si operación de catálogo tiene tiempo predeterminado, se autoasigna; si no, obligatorio manual.
- Puede asociar múltiples herramientas/máquinas.

## 6.3 Fórmulas de cierre (USD/CUP)

### Salario

Para cada asignación operario-operación:

- `salario_usd_base = tarifa_operario_usd_hora * horas`
- `salario_cup_base = tarifa_operario_cup_hora * horas`

Totales base OT:

- `sum_salario_usd_base = Σ salario_usd_base`
- `sum_salario_cup_base = Σ salario_cup_base`

Factor:

- `salario_usd = sum_salario_usd_base * 1.0909`
- `salario_cup = sum_salario_cup_base * 1.0909`

### Gastos asociados al salario

- `gasto_asoc_usd = 0.00`
- `gasto_asoc_cup = salario_cup * 1.19`

### Depreciación

Por herramienta asociada:

- `dep_usd = horas * thd_usd_aplicado`
- `dep_cup = horas * thd_cup_aplicado`

Totales:

- `depreciacion_usd = Σ dep_usd`
- `depreciacion_cup = Σ dep_cup`

### Servicios subcontratados

- `servicios_usd = Σ costo_usd`
- `servicios_cup = Σ costo_cup`

### Insumos + PPA

- `insumos_usd = Σ costo_usd`, `insumos_cup = Σ costo_cup`
- `ppa_usd = Σ costo_usd`, `ppa_cup = Σ costo_cup`

### Total costos y gastos

- `total_costos_usd = salario_usd + gasto_asoc_usd + depreciacion_usd + servicios_usd + insumos_usd + ppa_usd`
- `total_costos_cup = salario_cup + gasto_asoc_cup + depreciacion_cup + servicios_cup + insumos_cup + ppa_cup`

### Margen comercial por cliente

- `margen_usd = total_costos_usd * (cliente.margen_usd_pct / 100)`
- `margen_cup = total_costos_cup * (cliente.margen_cup_pct / 100)`

### Total facturar

- `total_facturar_usd = total_costos_usd + margen_usd`
- `total_facturar_cup = total_costos_cup + margen_cup`

---

# 7) Diseño de pantallas

1. Login.
2. Dashboard inicial.
3. Lista de OTs con filtros avanzados.
4. Wizard de apertura OT.
5. Detalle OT (tabs: recepción, operaciones, insumos, PPA, subcontratados, costos, auditoría).
6. Módulo maestros (CRUDs estandarizados).
7. Cierre OT con vista previa de cálculo.
8. Reportes con exportación.

---

# 8) Dashboard propuesto

KPIs:

- OTs abiertas/cerradas.
- OTs por estado.
- Costos y facturación por período (USD/CUP).
- Top clientes.
- Top vehículos intervenidos.
- Piezas mayor/menor recambio.
- % piezas recuperadas.
- Productividad por operario.
- Costo por tipo de operación.

---

# 9) Estructura técnica del proyecto

- `/backend`: API NestJS.
- `/frontend`: SPA React.
- `/prisma`: esquema y seeds.
- `/scripts`: utilidades SQL/seed/export.
- `/docs`: arquitectura y decisiones.

---

# 10) Convención de carpetas

- Backend por **dominios**, no por tipo técnico global.
- Frontend por **features** + `shared`.
- DTOs separados de entidades de persistencia.
- Convención de nombres: `kebab-case` en archivos, `PascalCase` clases, `camelCase` props.

---

# 11) Endpoints principales del backend

## Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Maestros

- CRUD `/api/v1/clients`
- CRUD `/api/v1/establishments`
- CRUD `/api/v1/warehouses`
- CRUD `/api/v1/exchange-rates`
- CRUD `/api/v1/operation-catalog`
- CRUD `/api/v1/operators`
- CRUD `/api/v1/machines-tools`
- CRUD `/api/v1/vehicles`

## Órdenes

- `POST /api/v1/work-orders`
- `GET /api/v1/work-orders`
- `GET /api/v1/work-orders/:id`
- `PATCH /api/v1/work-orders/:id`
- `POST /api/v1/work-orders/:id/operations`
- `POST /api/v1/work-orders/:id/consumables`
- `POST /api/v1/work-orders/:id/ppas`
- `POST /api/v1/work-orders/:id/outsourced-services`
- `POST /api/v1/work-orders/:id/calculate-preview`
- `POST /api/v1/work-orders/:id/close`
- `POST /api/v1/work-orders/:id/cancel`

## Reportes y dashboard

- `GET /api/v1/reports/work-orders`
- `GET /api/v1/reports/costs`
- `GET /api/v1/reports/productivity`
- `GET /api/v1/dashboard/kpis`

---

# 12) Estrategia de autenticación y permisos

- JWT Access Token corto (15m) + Refresh Token rotado (7d).
- Refresh token hasheado en BD.
- RBAC con tabla `permissions` y mapeo `role_permissions`.
- Guards en NestJS: `JwtAuthGuard` + `PermissionsGuard`.
- Auditoría para acciones críticas: login, cierre/anulación OT, CRUD maestros sensibles.

---

# 13) Script SQL inicial para MariaDB

Ver archivo `scripts/init-mariadb.sql`.

---

# 14) Código base inicial del backend NestJS

Ver carpeta `backend/` con:

- bootstrap, módulo raíz, configuración.
- módulos `auth`, `rbac`, `work-orders`, `masters`, `reports`, `dashboard`.
- servicio de cálculo de costos con reglas USD/CUP.

---

# 15) Código base inicial del frontend React + TypeScript

Ver carpeta `frontend/` con:

- layout corporativo (sidebar + header).
- rutas privadas.
- páginas base: login, dashboard, lista/detalle OT, maestros.
- capa API base y tipos de dominio.

---

# 16) Datos semilla de ejemplo

Ver `prisma/seed.ts`.

Incluye:
- roles/permisos base.
- usuario admin inicial.
- maestros mínimos (cliente, establecimiento, operación, operario, herramienta).

---

# 17) Instrucciones para levantar el proyecto

1. Crear BD MariaDB y ejecutar `scripts/init-mariadb.sql` (opcional si se usa Prisma migrate).
2. Configurar `.env` backend/frontend.
3. Backend:
   - `cd backend`
   - `npm install`
   - `npx prisma generate`
   - `npx prisma migrate dev`
   - `npm run start:dev`
4. Seed:
   - `cd ..`
   - `npm install`
   - `npx prisma db seed`
5. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

---

# 18) Recomendaciones de escalabilidad futura

1. Separar módulo de costeo como servicio independiente.
2. Event-driven para auditoría/reportería asíncrona.
3. Almacenamiento de evidencias en objeto (S3 compatible).
4. Cola de trabajos para exportación PDF/Excel pesada.
5. Versionado de reglas de costeo por vigencia.
6. Multi-tenant por establecimiento/empresa.
7. Integración con inventario/compras/facturación electrónica.
8. Portal de consulta externa con permisos acotados.
