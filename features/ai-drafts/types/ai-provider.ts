export type DraftTone = "professional" | "friendly" | "concise" | "empathetic";

export type GenerateDraftInput = {
  organizationId?: string;
  subject: string;
  customerName: string;
  customerMessage: string;
  tone?: DraftTone;
};

export type GenerateDraftResult = {
  draft: string;
  model?: string;
};

export type AiDraftProvider = {
  generateDraft(input: GenerateDraftInput): Promise<GenerateDraftResult>;
};
