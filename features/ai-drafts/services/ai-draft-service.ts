type GenerateAiDraftInput = {
  subject: string;
  customerName: string;
  customerMessage: string;
};

export async function generateAiDraftReply(input: GenerateAiDraftInput) {
  return {
    draft: `Hi ${input.customerName},

Thanks for reaching out. I checked your message about "${input.subject}".

I understand you are having trouble with this. I will review the account details and get back to you with the next steps shortly.

Kind regards,
Support Team`,
  };
}
