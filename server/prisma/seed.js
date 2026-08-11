const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Очистка...');
    await prisma.incident.deleteMany().catch(e => {}); // Ignore errors if table not found
    await prisma.waterCamera.deleteMany().catch(e => {});
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    console.log('🌱 Создание...');
    const hash = await bcrypt.hash('123', 10);

    // 1. Организация
    const org = await prisma.organization.create({
        data: {
            name: "Ургенчский Гос. Университет",
            type: "education",
            address: "г. Ургенч, ул. Х. Олимджан, 14",
            lat: 41.55, lng: 60.62,
        }
    });

    // 2. Пользователи (С ПОЛЕМ fullName)
    await prisma.user.createMany({
        data: [
            { username: "super", password: hash, fullName: "Главный Администратор", role: "SUPER_ADMIN" },
            { username: "mchs", password: hash, fullName: "Дежурный МЧС", role: "MCHS_USER" },
            { username: "installer", password: hash, fullName: "Мастер Установки", role: "ADMIN" },
            { username: "urgu", password: hash, fullName: "Оператор УрГУ", role: "ORG_OPERATOR", organizationId: org.id },
            { username: "map_only", password: hash, fullName: "Оператор интерактивной карты", role: "MAP_OPERATOR" },
            { username: "hazard_only", password: hash, fullName: "Оператор карты угроз", role: "HAZARD_OPERATOR" }
        ]
    });

    // 3. Устройства
    await prisma.device.create({
        data: {
            name: "УрГУ - Серверная",
            token: "TOKEN-001",
            type: "gas",
            status: "ONLINE",
            floor: 1,
            addressDetails: "Корпус А, серверная",
            installedBy: "super",
            batteryLevel: 96,
            lastSeen: new Date(),
            lat: 41.55, lng: 60.62,
            organizationId: org.id,
        }
    });

    console.log('✅ Готово! Пароль для всех: 123');
}

main()
  .catch((e) => {
      console.error("ОШИБКА SEED:", e);
      process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
