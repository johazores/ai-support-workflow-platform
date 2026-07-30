export const systemSettingKeys = {
  allowLegacyProductAuth: "auth.allow_legacy_product_auth",
  allowMockAi: "ai.allow_mock_provider",
  inboundEmailWebhookSecret: "email.inbound_webhook_secret",
} as const;

export type SystemSettingKey =
  (typeof systemSettingKeys)[keyof typeof systemSettingKeys];
