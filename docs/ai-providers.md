# AI Draft Providers

AI-assisted draft generation uses the existing provider chain and encrypted Root Admin provider configuration.

## Supported adapters

The draft-generation runtime now has adapters for:

- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- Groq
- Together AI
- DeepSeek

Development-only mock AI remains available only when `ALLOW_MOCK_AI=true` outside production.

## Configuration precedence

Each provider first resolves the enabled database-managed provider configuration. When a database-managed credential, model, or base URL is available, it takes precedence over environment migration values.

Environment variables remain temporary migration/bootstrap fallbacks. The product direction is Root Admin-managed encrypted provider configuration.

OpenRouter and Together AI intentionally require an explicit database or environment model rather than silently choosing a provider-specific model that may change underneath the application.

## OpenAI-compatible providers

OpenAI, OpenRouter, Groq, Together AI, and DeepSeek share one OpenAI-compatible adapter implementation. This avoids duplicating request construction, prompt handling, response validation, and model reporting.

OpenRouter can optionally read these provider `configuration` fields:

- `httpReferer` -> `HTTP-Referer`
- `appTitle` -> `X-Title`

## Google Gemini

Gemini uses its native `generateContent` API. The adapter supports database-managed credentials/models/base URL and temporary `GEMINI_API_KEY` / `GEMINI_MODEL` fallback values.

## Usage telemetry

Providers return the actual model used for a successful request. `AiUsageLog` and `ProviderUsageRecord` persist that actual model instead of the previous `database-configured` placeholder when a database-selected model handled the request.

Provider telemetry remains non-blocking: a successful customer draft is not converted into a failure when usage-metric persistence is unavailable.

## Remaining provider-runtime work

The current chain still has a fixed application order. A separate runtime-resolver increment will make database provider priority and explicit enabled/disabled state authoritative while preserving a safe migration path for legacy environment configuration.
