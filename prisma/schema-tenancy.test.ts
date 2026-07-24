import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

function modelBlock(modelName: string) {
  const match = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`, "m"));

  if (!match) {
    throw new Error(`Missing Prisma model: ${modelName}`);
  }

  return match[1];
}

describe("tenant-owned unique constraints", () => {
  it.each([
    ["Customer", "email"],
    ["Tag", "name"],
    ["SlaPolicy", "priority"],
    ["EmailConfig", "fromAddress"],
  ])("scopes %s.%s by organization", (modelName, fieldName) => {
    const block = modelBlock(modelName);

    expect(block).toContain(`@@unique([organizationId, ${fieldName}])`);
    expect(block).not.toMatch(new RegExp(`\\b${fieldName}\\s+String\\s+@unique\\b`));
  });
});
