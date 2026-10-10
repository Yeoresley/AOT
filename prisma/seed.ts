import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  const client = await prisma.client.create({
    data: { name: 'Rapitrans Cliente Base', marginUsdPct: 15, marginCupPct: 12 },
  });

  const establishment = await prisma.establishment.create({
    data: { name: 'Taller Central', address: 'Zona Industrial, La Habana' },
  });

  await prisma.operationCatalog.create({
    data: { description: 'Cambio de frenos', defaultHours: 2.5 },
  });

  await prisma.operator.create({
    data: { fullName: 'Juan Pérez', salaryUsdPerHour: 3.4, salaryCupPerHour: 850 },
  });

  await prisma.machineTool.create({
    data: {
      description: 'Elevador hidráulico',
      valueUsd: 3200,
      valueCup: 768000,
      depreciationRate: 0.18,
      thdUsd: 3200 * 0.18 / 360 / 8,
      thdCup: 768000 * 0.18 / 360 / 8,
      isAft: true,
    },
  });

  await prisma.vehicle.create({
    data: { plate: 'B123456', brand: 'Toyota', model: 'Hilux', year: 2020 },
  });

  console.log({ user: user.username, client: client.name, establishment: establishment.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
