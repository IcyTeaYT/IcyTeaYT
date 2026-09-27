import { categoryLabel } from '../../src/data/categories';
import type { Env } from './util';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Sends a new suggestion to the council's Telegram chat. Needs the
 * TELEGRAM_TOKEN secret (TELEGRAM_BOT_TOKEN also works) and TELEGRAM_CHAT_ID;
 * does nothing without them.
 * Failures are logged, never shown to the person who sent the suggestion.
 */
export async function notifyTelegram(
  env: Env,
  s: { id: number | null; text: string; category: string; name: string; grade: string },
) {
  // Forgive the usual paste slips: surrounding spaces or quotes, a leading "bot".
  const token = (env.TELEGRAM_TOKEN ?? env.TELEGRAM_BOT_TOKEN ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^bot/i, '');
  const chatId = (env.TELEGRAM_CHAT_ID ?? '').trim();
  if (!token || !chatId) return;
  const from = s.name || s.grade ? [s.name || 'No name', s.grade && `Grade ${s.grade}`].filter(Boolean).join(' · ') : 'Anonymous';
  const message = [
    `💡 <b>New suggestion</b>${s.id ? ` #${s.id}` : ''}`,
    `<b>Category:</b> ${escape(categoryLabel(s.category))}`,
    `<b>From:</b> ${escape(from)}`,
    '',
    escape(s.text),
  ].join('\n');
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('telegram sendMessage failed', res.status, await res.text());
  } catch (err) {
    console.error('telegram sendMessage failed', err);
  }
}
