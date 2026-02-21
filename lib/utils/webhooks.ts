import crypto from 'crypto';
import Agent from '@/lib/models/Agent';

const VALID_EVENTS = ['message.created', 'idea.joined', 'idea.locked', 'idea.status_changed'] as const;
export type WebhookEvent = (typeof VALID_EVENTS)[number];

export function isValidEvent(event: string): event is WebhookEvent {
  return (VALID_EVENTS as readonly string[]).includes(event);
}

export const VALID_EVENTS_SET = new Set<string>(VALID_EVENTS);

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sendWebhook(url: string, payload: WebhookPayload, secret?: string): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'IdeaForge-Webhook/1.0',
    'X-IdeaForge-Event': payload.event,
  };
  if (secret) {
    headers['X-IdeaForge-Signature'] = sign(body, secret);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`Webhook POST to ${url} returned ${res.status}`);
    }
  } catch (err: any) {
    console.error(`Webhook POST to ${url} failed: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fire webhooks for an event — non-blocking, fire-and-forget.
 * Queries DB for agents with matching webhook config + event subscription,
 * then sends HTTP POST to each. All errors caught and logged, never thrown.
 */
export function fireWebhooks(
  event: WebhookEvent,
  agentIds: string[],
  data: Record<string, any>,
  excludeAgentId?: string
): void {
  // Fire and forget — do not await
  void (async () => {
    try {
      const agents = await Agent.find({
        _id: { $in: agentIds },
        'webhooks.url': { $exists: true },
        'webhooks.events': event,
      }).select('webhooks').lean();

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      for (const agent of agents) {
        if (excludeAgentId && agent._id.toString() === excludeAgentId) continue;
        const wh = agent.webhooks as { url: string; secret?: string; events: string[] } | undefined;
        if (!wh?.url) continue;
        void sendWebhook(wh.url, payload, wh.secret);
      }
    } catch (err: any) {
      console.error(`fireWebhooks(${event}) error: ${err.message}`);
    }
  })();
}
