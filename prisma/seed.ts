import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.aiUsageLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workflowRule.deleteMany();

  // --- Users ---
  const passwordHash = await bcrypt.hash("admin123", 10);
  const supportHash = await bcrypt.hash("support123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "alex@company.com",
      passwordHash,
      role: "admin",
    },
  });

  const supportUser = await prisma.user.create({
    data: {
      name: "Jordan Lee",
      email: "jordan@company.com",
      passwordHash: supportHash,
      role: "agent",
    },
  });

  await prisma.user.create({
    data: {
      name: "Sam Taylor",
      email: "sam@company.com",
      passwordHash: supportHash,
      role: "supervisor",
    },
  });

  // --- Customers ---
  const customers = await Promise.all([
    prisma.customer.create({
      data: { name: "Maria Santos", email: "maria@acmecorp.com" },
    }),
    prisma.customer.create({
      data: { name: "James Chen", email: "james.chen@globex.io" },
    }),
    prisma.customer.create({
      data: { name: "Priya Sharma", email: "priya@initech.co" },
    }),
    prisma.customer.create({
      data: { name: "Lucas Müller", email: "lucas.muller@waynetech.de" },
    }),
    prisma.customer.create({
      data: { name: "Aisha Okafor", email: "aisha@umbrella.ng" },
    }),
    prisma.customer.create({
      data: { name: "Tom Nakamura", email: "tom@soylent.jp" },
    }),
  ]);

  // --- Tickets with messages ---

  // Ticket 1 — open, high priority, unassigned
  const t1 = await prisma.ticket.create({
    data: {
      subject: "Cannot access my account after password reset",
      status: "open",
      priority: "high",
      customerId: customers[0].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t1.id,
      author: "customer",
      body: "Hi, I reset my password yesterday but I still can't log in. I've tried clearing cookies and using incognito mode. The error just says 'Invalid credentials'. Can you help?",
    },
  });

  // Ticket 2 — pending, normal priority, assigned
  const t2 = await prisma.ticket.create({
    data: {
      subject: "Billing discrepancy on last invoice",
      status: "pending",
      priority: "normal",
      customerId: customers[1].id,
      assigneeName: supportUser.name,
      assigneeEmail: supportUser.email,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t2.id,
      author: "customer",
      body: "I was charged $149.99 instead of the $99.99 on my plan. Invoice #INV-2024-0847. Could you look into this?",
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t2.id,
      author: "support",
      body: "Hi James, thanks for reaching out. I can see the discrepancy on your account. Let me escalate this to our billing team and get back to you within 24 hours.",
    },
  });

  // Ticket 3 — open, urgent, unassigned
  const t3 = await prisma.ticket.create({
    data: {
      subject: "Production API returning 500 errors",
      status: "open",
      priority: "urgent",
      customerId: customers[2].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t3.id,
      author: "customer",
      body: "Our production environment has been getting intermittent 500 errors from your API for the last 2 hours. Endpoint: POST /v2/transactions. This is blocking our checkout flow. Request ID: req_8f3a2b1c.",
    },
  });

  // Ticket 4 — resolved, normal priority
  const t4 = await prisma.ticket.create({
    data: {
      subject: "How to set up SSO integration",
      status: "resolved",
      priority: "normal",
      customerId: customers[3].id,
      assigneeName: admin.name,
      assigneeEmail: admin.email,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t4.id,
      author: "customer",
      body: "We'd like to set up SAML-based SSO for our team. Could you point me to the documentation or walk me through the process?",
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t4.id,
      author: "support",
      body: "Hi Lucas! You can configure SSO under Settings > Security > SAML. Here's our guide: docs.example.com/sso-setup. You'll need your IdP metadata XML and an admin account. Let me know if you run into any issues.",
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t4.id,
      author: "customer",
      body: "That worked perfectly, thanks! SSO is live for our team now.",
    },
  });

  // Ticket 5 — open, low priority
  const t5 = await prisma.ticket.create({
    data: {
      subject: "Feature request: dark mode for dashboard",
      status: "open",
      priority: "low",
      customerId: customers[4].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t5.id,
      author: "customer",
      body: "Would love to have a dark mode option for the dashboard. Several people on our team work late and the bright white interface is hard on the eyes.",
    },
  });

  // Ticket 6 — pending, high priority, assigned
  const t6 = await prisma.ticket.create({
    data: {
      subject: "Data export failing for large datasets",
      status: "pending",
      priority: "high",
      customerId: customers[5].id,
      assigneeName: supportUser.name,
      assigneeEmail: supportUser.email,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t6.id,
      author: "customer",
      body: "When I try to export more than 50,000 records as CSV, the export times out after about 3 minutes. Smaller exports work fine. We need to pull a full audit report by end of week.",
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t6.id,
      author: "support",
      body: "Hi Tom, I've reproduced the issue on our end. The engineering team is working on a fix for large dataset exports. In the meantime, you can export in batches using date range filters. I'll update you as soon as the fix is deployed.",
    },
  });

  // Ticket 7 — open, normal, multi-message thread
  const t7 = await prisma.ticket.create({
    data: {
      subject: "Webhook notifications not being delivered",
      status: "open",
      priority: "normal",
      customerId: customers[2].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t7.id,
      author: "customer",
      body: "We configured webhooks to https://hooks.initech.co/payments but we're not receiving any events since yesterday. Our endpoint is healthy — tested it manually.",
    },
  });

  // Ticket 8 — open, normal
  const t8 = await prisma.ticket.create({
    data: {
      subject: "Need to upgrade plan but button is greyed out",
      status: "open",
      priority: "normal",
      customerId: customers[0].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t8.id,
      author: "customer",
      body: "I'm trying to upgrade from the Starter plan to Professional but the upgrade button is greyed out in the billing page. I'm logged in as the account owner.",
    },
  });

  // Ticket 9 — resolved, low priority
  const t9 = await prisma.ticket.create({
    data: {
      subject: "Typo in automated email template",
      status: "resolved",
      priority: "low",
      customerId: customers[3].id,
      assigneeName: admin.name,
      assigneeEmail: admin.email,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t9.id,
      author: "customer",
      body: "The welcome email says 'Thank you for singing up' instead of 'signing up'. Minor but looks unprofessional.",
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t9.id,
      author: "support",
      body: "Good catch, Lucas! We've fixed the typo and it's live now. Thanks for letting us know.",
    },
  });

  // Ticket 10 — open, urgent
  const t10 = await prisma.ticket.create({
    data: {
      subject: "Security concern: unauthorized login attempts",
      status: "open",
      priority: "urgent",
      customerId: customers[4].id,
    },
  });
  await prisma.message.create({
    data: {
      ticketId: t10.id,
      author: "customer",
      body: "I received 15 email notifications about failed login attempts to our admin account in the last hour. The IPs are from different countries. Is there a way to enable IP allowlisting or 2FA?",
    },
  });

  // --- Activity logs ---
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: t2.id,
        type: "status-change",
        message: "Status changed from open to pending",
      },
      {
        ticketId: t2.id,
        type: "assignment",
        message: `Assigned to ${supportUser.name}`,
      },
      {
        ticketId: t4.id,
        type: "status-change",
        message: "Status changed from open to resolved",
      },
      {
        ticketId: t6.id,
        type: "assignment",
        message: `Assigned to ${supportUser.name}`,
      },
      {
        ticketId: t6.id,
        type: "status-change",
        message: "Status changed from open to pending",
      },
      {
        ticketId: t9.id,
        type: "status-change",
        message: "Status changed from open to resolved",
      },
    ],
  });

  // --- Workflow rules ---
  await prisma.workflowRule.create({
    data: {
      name: "Account access triage",
      description: "Prepare account access issues for support follow-up.",
      trigger: JSON.stringify({
        field: "subject",
        operator: "contains",
        value: "account",
      }),
      actions: [
        { type: "change-status", value: "pending" },
        { type: "generate-draft", value: "account-access-reply" },
      ],
    },
  });

  await prisma.workflowRule.create({
    data: {
      name: "Urgent ticket escalation",
      description:
        "Auto-assign urgent tickets and generate initial response draft.",
      trigger: JSON.stringify({
        field: "priority",
        operator: "equals",
        value: "urgent",
      }),
      actions: [
        { type: "assign-ticket", value: "Alex Rivera" },
        { type: "generate-draft", value: "urgent-acknowledgment" },
      ],
    },
  });

  await prisma.workflowRule.create({
    data: {
      name: "Billing inquiry handler",
      description: "Route billing-related tickets to the support team.",
      trigger: JSON.stringify({
        field: "subject",
        operator: "contains",
        value: "billing",
      }),
      actions: [
        { type: "assign-ticket", value: "Jordan Lee" },
        { type: "change-status", value: "pending" },
      ],
    },
  });

  console.log(
    "Seed complete: 2 users, 6 customers, 10 tickets, 3 workflow rules",
  );

  // Seed SLA policies
  const slaPolicies = [
    {
      name: "Urgent",
      priority: "urgent",
      firstResponseMinutes: 30,
      resolutionMinutes: 240,
    },
    {
      name: "High",
      priority: "high",
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
    },
    {
      name: "Normal",
      priority: "normal",
      firstResponseMinutes: 240,
      resolutionMinutes: 1440,
    },
    {
      name: "Low",
      priority: "low",
      firstResponseMinutes: 480,
      resolutionMinutes: 2880,
    },
  ];

  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {},
      create: policy,
    });
  }

  console.log("Seed complete: 4 SLA policies");
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
