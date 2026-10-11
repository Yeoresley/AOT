import { PrismaClient } from '../backend/node_modules/@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    'work_orders.read',
    'work_orders.write',
    'work_orders.close',
    'masters.read',
    'masters.write',
    'reports.read',
    'dashboard.read',
  ];

  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    create: { code: 'ADMIN', name: 'Administrador' },
    update: {},
  });

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: adminRole.id, permissionId: permission.id },
      update: {},
    });
  }

  const passwordHash = await bcrypt.hash('Admin#2026', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      fullName: 'Administrador General',
      passwordHash,
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    create: { userId: user.id, roleId: adminRole.id },
    update: {},
  });

  const clientName = 'Rapitrans Cliente Base';
  const client = await prisma.client.findFirst({ where: { name: clientName } }) ??
    await prisma.client.create({
      data: { name: clientName, marginUsdPct: 15, marginCupPct: 12 },
    });

  const establishmentName = 'Taller Central';
  const establishment = await prisma.establishment.findFirst({ where: { name: establishmentName } }) ??
    await prisma.establishment.create({
      data: { name: establishmentName, address: 'Zona Industrial, La Habana' },
    });

  for (const operation of [
    { description: 'Cambio de frenos', defaultHours: 2.5 },
    { description: 'Cambio de aceite', defaultHours: 1 },
    { description: 'Servicio subcontratado', defaultHours: null },
  ]) {
    const existingOperation = await prisma.operationCatalog.findFirst({
      where: { description: operation.description },
    });
    if (!existingOperation) await prisma.operationCatalog.create({ data: operation });
  }

  const operator = await prisma.operator.findFirst({ where: { fullName: 'Juan Pérez' } });
  if (!operator) {
    await prisma.operator.create({
      data: { fullName: 'Juan Pérez', salaryUsdPerHour: 3.4, salaryCupPerHour: 850 },
    });
  }

  const machineTool = await prisma.machineTool.findFirst({ where: { description: 'Elevador hidráulico' } });
  if (!machineTool) {
    await prisma.machineTool.create({
      data: {
        description: 'Elevador hidráulico',
        valueUsd: 3200,
        valueCup: 768000,
        depreciationRate: 0.18,
        thdUsd: 3200 * 0.18 / (12 * 192),
        thdCup: 768000 * 0.18 / (12 * 192),
        isAft: true,
      },
    });
  }

  await prisma.vehicle.upsert({
    where: { plate: 'B123456' },
    create: { plate: 'B123456', brand: 'Toyota', model: 'Hilux', year: 2020 },
    update: {},
  });

  console.log({ user: user.username, client: client.name, establishment: establishment.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
