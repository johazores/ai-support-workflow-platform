import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-encryption";
import { updateProviderTestResult } from "@/features/providers/services/provider-service";

type TestRequest = {
  url: string;
  headers?: Record<string, string>;
};

function buildTestRequest(provider: {
  key: string;
  baseUrl: string | null;
  credential: string;
}): TestRequest | null {
  const bearerHeaders = { Authorization: `Bearer ${provider.credential}` };

  switch (provider.key) {
    case "openai":
      return {
        url: `${provider.baseUrl || "https://api.openai.com/v1"}/models`,
        headers: bearerHeaders,
      };
    case "anthropic":
      return {
        url: `${provider.baseUrl || "https://api.anthropic.com/v1"}/models`,
        headers: {
          "x-api-key": provider.credential,
          "anthropic-version": "2023-06-01",
        },
      };
    case "google-gemini":
      return {
        url: `${provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models?key=${encodeURIComponent(provider.credential)}`,
      };
    case "openrouter":
      return {
        url: `${provider.baseUrl || "https://openrouter.ai/api/v1"}/models`,
        headers: bearerHeaders,
      };
    case "groq":
      return {
        url: `${provider.baseUrl || "https://api.groq.com/openai/v1"}/models`,
        headers: bearerHeaders,
      };
    case "together-ai":
      return {
        url: `${provider.baseUrl || "https://api.together.xyz/v1"}/models`,
        headers: bearerHeaders,
      };
    case "deepseek":
      return {
        url: `${provider.baseUrl || "https://api.deepseek.com"}/models`,
        headers: bearerHeaders,
      };
    case "slack":
      return {
        url: provider.baseUrl || "https://slack.com/api/auth.test",
        headers: bearerHeaders,
      };
    case "discord":
      return {
        url: provider.baseUrl || "https://discord.com/api/v10/users/@me",
        headers: { Authorization: `Bot ${provider.credential}` },
      };
    case "resend":
      return {
        url: provider.baseUrl || "https://api.resend.com/domains",
        headers: bearerHeaders,
      };
    case "stripe":
      return {
        url: provider.baseUrl || "https://api.stripe.com/v1/balance",
        headers: bearerHeaders,
      };
    case "github":
      return {
        url: provider.baseUrl || "https://api.github.com/user",
        headers: {
          ...bearerHeaders,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      };
    default:
      return null;
  }
}

export async function testProviderConnection(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  if (!provider) throw new Error("Provider not found");

  const credentialRecord = await prisma.providerCredential.findFirst({
    where: { providerId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!credentialRecord) {
    const result = { success: false, error: "No active credential configured" };
    await updateProviderTestResult(providerId, result);
    return result;
  }

  const credential = decryptSecret(credentialRecord.encryptedValue);
  const request = buildTestRequest({
    key: provider.key,
    baseUrl: provider.baseUrl,
    credential,
  });

  if (!request) {
    const result = {
      success: false,
      error: "Automatic connection testing is unavailable for this provider",
    };
    await updateProviderTestResult(providerId, result);
    return result;
  }

  try {
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const result = {
        success: false,
        error: `Provider returned HTTP ${response.status}`,
      };
      await updateProviderTestResult(providerId, result);
      return result;
    }

    const result = { success: true };
    await updateProviderTestResult(providerId, result);
    return result;
  } catch (error) {
    const result = {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
    await updateProviderTestResult(providerId, result);
    return result;
  }
}
