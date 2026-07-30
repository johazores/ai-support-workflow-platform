import { systemSettingKeys } from "@/features/system-settings/services/system-setting-keys";
import { getBooleanSystemSetting } from "@/features/system-settings/services/system-setting-service";

export async function isLegacyProductAuthEnabled() {
  if (process.env.NODE_ENV === "production") return false;

  return getBooleanSystemSetting(
    systemSettingKeys.allowLegacyProductAuth,
    false,
  );
}

export function legacyProductAuthDisabledMessage() {
  return "Legacy product authentication is disabled. Configure Clerk for product users or enable the migration setting in Root Admin.";
}
