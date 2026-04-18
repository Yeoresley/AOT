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
