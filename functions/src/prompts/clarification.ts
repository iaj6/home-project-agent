export interface ProjectIntake {
  title: string;
  description: string;
  zipCode: string;
  budget?: number;
  timeline?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export function buildClarificationPrompt(
  categoryGuidance: string,
  intake: ProjectIntake,
): string {
  const knownFacts = [
    `- Title: ${intake.title}`,
    `- Description: ${intake.description}`,
    `- ZIP: ${intake.zipCode}`,
    intake.budget != null ? `- Budget: $${intake.budget}` : null,
    intake.timeline ? `- Timeline: ${intake.timeline}` : null,
    intake.experienceLevel ? `- Experience level: ${intake.experienceLevel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are in the clarification phase of a home improvement project consultation.

The homeowner has ALREADY supplied these facts via the intake form. Treat them as known. Do NOT re-ask for any of these fields:
${knownFacts}

Your goal is to gather any remaining information needed to generate a detailed project report. Ask ONE focused clarifying question at a time. Do not ask multiple questions in a single message.

${categoryGuidance}

Guidelines:
- Be conversational and encouraging
- Reference details the homeowner has already shared (including the intake fields above)
- Skip any clarification topic already answered by the intake. For example, if their experience level is "beginner", do not ask "how comfortable are you with power tools" — instead, calibrate your follow-up questions and eventual report to a beginner. If a ZIP is set, do not ask where they live; assume permit guidance from that ZIP.
- It is fine to ask for more depth on something the form covered (e.g. "you said beginner — have you done framing work before?") but do not ask for the value itself.
- After gathering sufficient information (typically 3-5 questions on top of the intake), determine that you have enough to generate a comprehensive report
- When you have enough information, signal readiness by including the following tag in your response: <report_ready>true</report_ready>
- When signaling report readiness, also provide a brief summary of what you've learned and let the homeowner know you're ready to generate their project plan

Do NOT include the <report_ready> tag until you have gathered enough information to produce accurate cost estimates, a task breakdown, and a realistic timeline.`;
}
