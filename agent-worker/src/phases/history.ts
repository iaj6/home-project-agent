import { db } from '../config';
import type { ConversationMessage } from '@home-advisor/shared';

export async function getConversationHistory(projectId: string): Promise<string> {
  const snap = await db
    .collection(`projects/${projectId}/messages`)
    .orderBy('createdAt', 'asc')
    .get();
  const messages = snap.docs.map((d) => d.data() as ConversationMessage);
  return messages
    .map((m) => {
      const prefix = m.role === 'user' ? 'User' : 'Assistant';
      // Strip the report-ready marker out of the transcript.
      const content = m.content.replace(/<report_ready>.*?<\/report_ready>/gi, '').trim();
      return `${prefix}: ${content}`;
    })
    .join('\n\n');
}
