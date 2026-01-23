import type { TelegramMessage, TelegramResponse } from '../types';
import { TelegramServiceError } from '../types';

/**
 * Send a message to Telegram using Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<TelegramResponse> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.message,
        parse_mode: message.parseMode || 'HTML',
        disable_web_page_preview: message.disableWebPagePreview ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as TelegramResponse;
      throw new TelegramServiceError(
        'telegram/api-error',
        `Telegram API error: ${errorData.description || response.statusText}`,
        response.status
      );
    }

    const result = (await response.json()) as TelegramResponse;
    console.log('✅ Telegram message sent successfully:', result.result?.message_id);
    return result;
  } catch (error) {
    if (error instanceof TelegramServiceError) {
      throw error;
    }

    console.error('❌ Failed to send Telegram message:', error);
    throw new TelegramServiceError(
      'telegram/send-failed',
      `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}
