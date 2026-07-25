import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ORGANIZATION_SLUG = "default-workspace";

async function main() {
  await prisma.workflowExecutionStep.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.aiUsageLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.csatRating.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.workflowRule.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();

  const organization = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORGANIZATION_SLUG },
    update: { name: "Default Workspace", status: "active" },
    create: {
      name: "Default Workspace",
      slug: DEFAULT_ORGANIZATION_SLUG,
      status: "active",
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  const supportHash = await bcrypt.hash("support123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "alex@company.com",
      passwordHash,
      defaultOrganizationId: organization.id,
      role: "admin",
      status: "active",
    },
  });

  const supportUser = await prisma.user.create({
    data: {
      name: "Jordan Lee",
      email: "jordan@company.com",
      passwordHash: supportHash,
      defaultOrganizationId: organization.id,
      role: "agent",
      status: "active",
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: "Sam Taylor",
      email: "sam@company.com",
      passwordHash: supportHash,
      defaultOrganizationId: organization.id,
      role: "supervisor",
      status: "active",
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: admin.id,
        role: "admin",
        status: "active",
      },
      {
        organizationId: organization.id,
        userId: supportUser.id,
        role: "agent",
        status: "active",
      },
      {
        organizationId: organization.id,
        userId: supervisor.id,
        role: "supervisor",
        status: "active",
      },
    ],
  });

  const customerData = [
    ["Maria Santos", "maria@acmecorp.com"],
    ["James Chen", "james.chen@globex.io"],
    ["Priya Sharma", "priya@initech.co"],
    ["Lucas Müller", "lucas.muller@waynetech.de"],
    ["Aisha Okafor", "aisha@umbrella.ng"],
    ["Tom Nakamura", "tom@soylent.jp"],
  ] as const;

  const customers = await Promise.all(
    customerData.map(([name, email]) =>
      prisma.customer.create({
        data: { organizationId: organization.id, name, email },
      }),
    ),
  );

  const ticketData = [
    {
      subject: "Cannot access my account after password reset",
      status: "open",
      priority: "high",
      customerId: customers[0].id,
      messages: [
        {
          author: "customer",
          body: "Hi, I reset my password yesterday but I still can't log in. I've tried clearing cookies and using incognito mode. The error just says 'Invalid credentials'. Can you help?",
        },
      ],
    },
    {
      subject: "Billing discrepancy on last invoice",
      status: "pending",
      priority: "normal",
      customerId: customers[1].id,
      assigneeName: supportUser.name,
      assigneeEmail: supportUser.email,
      messages: [
        {
          author: "customer",
          body: "I was charged $149.99 instead of the $99.99 on my plan. Invoice #INV-2024-0847. Could you look into this?",
        },
        {
          author: "support",
          body: "Hi James, thanks for reaching out. I can see the discrepancy on your account. Let me escalate this to our billing team and get back to you within 24 hours.",
        },
      ],
    },
    {
      subject: "Production API returning 500 errors",
      status: "open",
      priority: "urgent",
      customerId: customers[2].id,
      messages: [
        {
          author: "customer",
          body: "Our production environment has been getting intermittent 500 errors from your API for the last 2 hours. Endpoint: POST /v2/transactions. This is blocking our checkout flow.",
        },
      ],
    },
    {
      subject: "How to set up SSO integration",
      status: "resolved",
      priority: "normal",
      customerId: customers[3].id,
      assigneeName: admin.name,
      assigneeEmail: admin.email,
      messages: [
        {
          author: "customer",
          body: "We'd like to set up SAML-based SSO for our team. Could you point me to the documentation or walk me through the process?",
        },
        {
          author: "support",
          body: "You can configure SSO under Settings > Security > SAML. You'll need your IdP metadata XML and an admin account.",
        },
        {
          author: "customer",
          body: "That worked perfectly, thanks! SSO is live for our team now.",
        },
      ],
    },
    {
      subject: "Feature request: dark mode for dashboard",
      status: "open",
      priority: "low",
      customerId: customers[4].id,
      messages: [
        {
          author: "customer",
          body: "Would love to have a dark mode option for the dashboard. Several people on our team work late and the bright interface is hard on the eyes.",
        },
      ],
    },
    {
      subject: "Data export failing for large datasets",
      status: "pending",
      priority: "high",
      customerId: customers[5].id,
      assigneeName: supportUser.name,
      assigneeEmail: supportUser.email,
      messages: [
        {
          author: "customer",
          body: "When I try to export more than 50,000 records as CSV, the export times out. Smaller exports work fine.",
        },
        {
          author: "support",
          body: "I've reproduced the issue. The engineering team is working on a fix; in the meantime, export in batches using date range filters.",
        },
      ],
    },
    {
      subject: "Webhook notifications not being delivered",
      status: "open",
      priority: "normal",
      customerId: customers[2].id,
      messages: [
        {
          author: "customer",
          body: "We configured payment webhooks but have not received any events since yesterday. Our endpoint is healthy.",
        },
      ],
    },
    {
      subject: "Need to upgrade plan but button is greyed out",
      status: "open",
      priority: "normal",
      customerId: customers[0].id,
      messages: [
        {
          author: "customer",
          body: "I'm trying to upgrade from Starter to Professional but the upgrade button is disabled. I'm logged in as the account owner.",
        },
      ],
    },
    {
      subject: "Typo in automated email template",
      status: "resolved",
      priority: "low",
      customerId: customers[3].id,
      assigneeName: admin.name,
      assigneeEmail: admin.email,
      messages: [
        {
          author: "customer",
          body: "The welcome email says 'Thank you for singing up' instead of 'signing up'.",
        },
        {
          author: "support",
          body: "Good catch! We've fixed the typo and it's live now. Thanks for letting us know.",
        },
      ],
    },
    {
      subject: "Security concern: unauthorized login attempts",
      status: "open",
      priority: "urgent",
      customerId: customers[4].id,
      messages: [
        {
          author: "customer",
          body: "I received repeated failed-login notifications from several countries. Is there a way to enable IP allowlisting or 2FA?",
        },
      ],
    },
  ] as const;

  const tickets = [];
  for (const item of ticketData) {
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: organization.id,
        subject: item.subject,
        status: item.status,
        priority: item.priority,
        customerId: item.customerId,
        assigneeName: "assigneeName" in item ? item.assigneeName : undefined,
        assigneeEmail: "assigneeEmail" in item ? item.assigneeEmail : undefined,
      },
    });
    tickets.push(ticket);

    await prisma.message.createMany({
      data: item.messages.map((message) => ({
        organizationId: organization.id,
        ticketId: ticket.id,
        author: message.author,
        body: message.body,
      })),
    });
  }

  await prisma.activityLog.createMany({
    data: [
      {
        organizationId: organization.id,
        ticketId: tickets[1].id,
        type: "status-change",
        message: "Status changed from open to pending",
      },
      {
        organizationId: organization.id,
        ticketId: tickets[1].id,
        type: "assignment",
        message: `Assigned to ${supportUser.name}`,
      },
      {
        organizationId: organization.id,
        ticketId: tickets[3].id,
        type: "status-change",
        message: "Status changed from open to resolved",
      },
      {
        organizationId: organization.id,
        ticketId: tickets[5].id,
        type: "assignment",
        message: `Assigned to ${supportUser.name}`,
      },
      {
        organizationId: organization.id,
        ticketId: tickets[8].id,
        type: "status-change",
        message: "Status changed from open to resolved",
      },
    ],
  });

  await prisma.workflowRule.createMany({
    data: [
      {
        organizationId: organization.id,
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
      {
        organizationId: organization.id,
        name: "Urgent ticket escalation",
        description:
          "Auto-assign urgent tickets and generate initial response draft.",
        trigger: JSON.stringify({
          field: "priority",
          operator: "equals",
          value: "urgent",
        }),
        actions: [
          { type: "assign-ticket", value: admin.email },
          { type: "generate-draft", value: "urgent-acknowledgment" },
        ],
      },
      {
        organizationId: organization.id,
        name: "Billing inquiry handler",
        description: "Route billing-related tickets to the support team.",
        trigger: JSON.stringify({
          field: "subject",
          operator: "contains",
          value: "billing",
        }),
        actions: [
          { type: "assign-ticket", value: supportUser.email },
          { type: "change-status", value: "pending" },
        ],
      },
    ],
  });

  await prisma.slaPolicy.createMany({
    data: [
      {
        organizationId: organization.id,
        name: "Urgent",
        priority: "urgent",
        firstResponseMinutes: 30,
        resolutionMinutes: 240,
      },
      {
        organizationId: organization.id,
        name: "High",
        priority: "high",
        firstResponseMinutes: 60,
        resolutionMinutes: 480,
      },
      {
        organizationId: organization.id,
        name: "Normal",
        priority: "normal",
        firstResponseMinutes: 240,
        resolutionMinutes: 1440,
      },
      {
        organizationId: organization.id,
        name: "Low",
        priority: "low",
        firstResponseMinutes: 480,
        resolutionMinutes: 2880,
      },
    ],
  });

  console.log(
    "Seed complete: default workspace, 3 users, 6 customers, 10 tickets, 3 workflow rules, 4 SLA policies",
  );
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
