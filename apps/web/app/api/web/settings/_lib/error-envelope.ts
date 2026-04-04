import { getUiText } from "@/content/ui-text";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

export type SettingsOperation = "load" | "save";

export type SettingsErrorEnvelope = {
  error: string;
  code: string;
  detail: string;
  hint?: string;
};

type RawApiError = {
  errorCode: string | null;
  detail: string | null;
  hint: string | null;
};

function readApiError(bodyText: string): RawApiError {
  const json = parseResponseJson(bodyText);
  if (typeof json !== "object" || json === null) {
    return { errorCode: null, detail: null, hint: null };
  }
  const rec = json as Record<string, unknown>;
  return {
    errorCode: typeof rec.error === "string" ? rec.error : null,
    detail: typeof rec.detail === "string" ? rec.detail : null,
    hint: typeof rec.hint === "string" ? rec.hint : null,
  };
}

function fallbackDetail(locale: Locale, op: SettingsOperation): string {
  if (locale === "en") {
    return op === "load"
      ? "Settings could not be loaded."
      : "Settings could not be saved.";
  }
  return op === "load"
    ? "Einstellungen konnten nicht geladen werden."
    : "Einstellungen konnten nicht gespeichert werden.";
}

export function mapSettingsErrorEnvelope(args: {
  locale: Locale;
  operation: SettingsOperation;
  status: number;
  apiBodyText?: string;
}): SettingsErrorEnvelope {
  const { locale, operation, status, apiBodyText } = args;
  const text = getUiText(locale);
  const parsed = readApiError(apiBodyText ?? "");
  const errorCode = parsed.errorCode;

  if (
    status === 401 ||
    errorCode === "missing_auth" ||
    errorCode === "missing_auth_context"
  ) {
    return {
      error: text.api.auth.bffSessionInvalid,
      detail: text.api.auth.bffSessionInvalid,
      code: "AUTH_SESSION_INVALID",
    };
  }

  if (errorCode === "tenant_not_provisioned") {
    return {
      error: locale === "en" ? "Tenant is not provisioned yet." : "Mandant ist noch nicht provisioniert.",
      detail:
        parsed.detail ??
        (locale === "en"
          ? "Tenant is not provisioned yet."
          : "Mandant ist noch nicht provisioniert."),
      code: "TENANT_NOT_PROVISIONED",
      hint: parsed.hint ?? text.api.auth.bffTenantClaimMissingHint,
    };
  }

  if (status === 403 || errorCode === "forbidden") {
    return {
      error:
        locale === "en"
          ? "You do not have permission for this action."
          : "Keine Berechtigung fuer diese Aktion.",
      detail:
        locale === "en"
          ? "You do not have permission for this action."
          : "Keine Berechtigung fuer diese Aktion.",
      code: "SETTINGS_FORBIDDEN",
    };
  }

  if (
    status === 400 ||
    errorCode === "invalid_json" ||
    errorCode === "validation_error" ||
    errorCode === "invalid_body"
  ) {
    return {
      error:
        locale === "en"
          ? "Invalid input. Please check your entries."
          : "Ungueltige Eingaben. Bitte pruefe deine Angaben.",
      detail:
        locale === "en"
          ? "Invalid input. Please check your entries."
          : "Ungueltige Eingaben. Bitte pruefe deine Angaben.",
      code: "SETTINGS_VALIDATION_ERROR",
    };
  }

  if (status === 503 || errorCode === "database_unavailable") {
    return {
      error: text.api.auth.loginAuthServiceUnavailable,
      detail: text.api.auth.loginAuthServiceUnavailable,
      code: "UPSTREAM_UNAVAILABLE",
      hint:
        locale === "en"
          ? "Please try again in a moment."
          : "Bitte in wenigen Sekunden erneut versuchen.",
    };
  }

  return {
    error: fallbackDetail(locale, operation),
    detail: fallbackDetail(locale, operation),
    code: "SETTINGS_REQUEST_FAILED",
    hint: parsed.hint ?? undefined,
  };
}
