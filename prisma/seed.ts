import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcrypt-ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean slate - order matters because of foreign keys
  await prisma.activityLog.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("password123", 12);

  // Create users
  const rahul = await prisma.user.create({
    data: {
      name: "Rahul",
      email: "rahul@example.com",
      passwordHash: password,
    },
  });
  const sneha = await prisma.user.create({
    data: {
      name: "Sneha",
      email: "sneha@example.com",
      passwordHash: password,
    },
  });
  const pranay = await prisma.user.create({
    data: {
      name: "Pranay",
      email: "pranay@example.com",
      passwordHash: password,
    },
  });

  // Create group
  const group = await prisma.group.create({
    data: {
      name: "Goa Trip",
      createdBy: rahul.id,
      members: {
        create: [
          { userId: rahul.id },
          { userId: sneha.id },
          { userId: pranay.id },
        ],
      },
    },
  });

  // Expense 1: Rahul pays ₹3,000 for dinner, split three ways = ₹1,000 each
  await prisma.expense.create({
    data: {
      groupId: group.id,
      title: "Dinner",
      amount: 3000,
      paidById: rahul.id,
      idempotencyKey: "seed-expense-1",
      splits: {
        create: [
          { userId: rahul.id, shareAmount: 1000 },
          { userId: sneha.id, shareAmount: 1000 },
          { userId: pranay.id, shareAmount: 1000 },
        ],
      },
    },
  });

  // Expense 2: Sneha pays ₹1,500 for transport, split three ways = ₹500 each
  await prisma.expense.create({
    data: {
      groupId: group.id,
      title: "Transport",
      amount: 1500,
      paidById: sneha.id,
      idempotencyKey: "seed-expense-2",
      splits: {
        create: [
          { userId: rahul.id, shareAmount: 500 },
          { userId: sneha.id, shareAmount: 500 },
          { userId: pranay.id, shareAmount: 500 },
        ],
      },
    },
  });

  // Sneha settles ₹500 with Rahul (partial)
  await prisma.settlement.create({
    data: {
      groupId: group.id,
      paidById: sneha.id,
      paidToId: rahul.id,
      amount: 500,
      idempotencyKey: "seed-settlement-1",
    },
  });

  // Activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        groupId: group.id,
        userId: rahul.id,
        actionType: "EXPENSE_ADDED",
        metadata: { title: "Dinner", amount: 3000, paidByName: "Rahul" },
      },
      {
        groupId: group.id,
        userId: sneha.id,
        actionType: "EXPENSE_ADDED",
        metadata: { title: "Transport", amount: 1500, paidByName: "Sneha" },
      },
      {
        groupId: group.id,
        userId: sneha.id,
        actionType: "SETTLEMENT_RECORDED",
        metadata: { paidByName: "Sneha", paidToName: "Rahul", amount: 500 },
      },
    ],
  });

  console.log("✓ Seeded: 3 users, 1 group, 2 expenses, 1 settlement");
  console.log("  rahul@example.com / sneha@example.com / pranay@example.com");
  console.log("  Password: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
