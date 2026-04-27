import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.workflowRule.deleteMany();

  const customer = await prisma.customer.create({
    data: {
      name: "Maria Santos",
      email: "maria@example.com",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      subject: "Cannot access my account",
      status: "open",
      priority: "high",
      customerId: customer.id,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket.id,
      author: "customer",
      body: "Hi, I cannot access my account after resetting my password. Can you help me check this?",
    },
  });

  await prisma.workflowRule.create({
    data: {
      name: "Account access triage",
      description: "Prepare account access issues for support follow-up.",
      trigger: "ticket.subject contains account",
      actions: [
        {
          type: "change-status",
          value: "pending",
        },
        {
          type: "generate-draft",
          value: "account-access-reply",
        },
      ],
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
