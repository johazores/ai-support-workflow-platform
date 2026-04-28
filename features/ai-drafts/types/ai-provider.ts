export type GenerateDraftInput = {
  subject: string;
  customerName: string;
  customerMessage: string;
};

export type GenerateDraftResult = {
  draft: string;
};

export type AiDraftProvider = {
  generateDraft(input: GenerateDraftInput): Promise<GenerateDraftResult>;
};
