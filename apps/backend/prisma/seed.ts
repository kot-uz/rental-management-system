import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const existingOrg = await prisma.org.findFirst({ where: { name: 'Demo Properties' } });
  if (existingOrg) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  const org = await prisma.org.create({
    data: { name: 'Demo Properties', timezone: 'UTC', currency: 'USD' },
  });

  const passwordHash = await bcrypt.hash('password123', 12);
  const owner = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'owner@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Owner',
      role: 'OWNER',
    },
  });

  const apt1 = await prisma.apartment.create({
    data: {
      orgId: org.id,
      address: '123 Main Street',
      unitNumber: 'Apt 1A',
      floor: 1,
      rooms: 2,
      areaSqm: 65,
      status: 'OCCUPIED',
    },
  });

  const apt2 = await prisma.apartment.create({
    data: {
      orgId: org.id,
      address: '456 Oak Avenue',
      unitNumber: 'Unit 3B',
      floor: 3,
      rooms: 3,
      areaSqm: 85,
      status: 'VACANT',
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      orgId: org.id,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      idNumber: 'PS123456789',
      idType: 'PASSPORT',
      notes: 'Good tenant, always pays on time',
    },
  });

  const lease = await prisma.lease.create({
    data: {
      orgId: org.id,
      apartmentId: apt1.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      monthlyRent: 1500,
      currency: 'USD',
      depositAmount: 3000,
      depositBalance: 3000,
      rentDueDay: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.leaseParty.create({
    data: { leaseId: lease.id, tenantId: tenant.id, isPrimary: true },
  });

  const periods = [
    { month: 1, paid: true },
    { month: 2, paid: true },
    { month: 3, paid: false },
  ];

  for (const p of periods) {
    const period = await prisma.rentPeriod.create({
      data: {
        orgId: org.id,
        leaseId: lease.id,
        periodYear: 2024,
        periodMonth: p.month,
        dueDate: new Date(`2024-${String(p.month).padStart(2, '0')}-01`),
        expectedAmount: 1500,
        paidAmount: p.paid ? 1500 : 0,
        status: p.paid ? 'PAID' : 'OVERDUE',
      },
    });

    if (p.paid) {
      await prisma.payment.create({
        data: {
          orgId: org.id,
          rentPeriodId: period.id,
          amount: 1500,
          paymentDate: new Date(`2024-${String(p.month).padStart(2, '0')}-02`),
          method: 'BANK_TRANSFER',
          recordedBy: owner.id,
        },
      });
    }
  }

  await prisma.repair.create({
    data: {
      orgId: org.id,
      apartmentId: apt1.id,
      title: 'Leaking faucet in bathroom',
      description: 'The bathroom faucet has been leaking for 2 days',
      severity: 'MEDIUM',
      location: 'Bathroom',
      status: 'OPEN',
      costEstimate: 100,
    },
  });

  await prisma.utilityRecord.create({
    data: {
      orgId: org.id,
      apartmentId: apt1.id,
      leaseId: lease.id,
      type: 'ELECTRICITY',
      periodYear: 2024,
      periodMonth: 3,
      readingFrom: 100,
      readingTo: 135,
      amount: 87.50,
      status: 'UNPAID',
    },
  });

  console.log('Seed complete!');
  console.log(`Login: owner@demo.com / password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
