import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import { VALID_EVENTS_SET } from '@/lib/utils/webhooks';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    agent.lastActive = new Date();
    await agent.save();

    const agentJson = agent.toJSON();
    return successResponse({
      id: agent._id,
      name: agent.name,
      description: agent.description,
      claimStatus: agent.claimStatus,
      ownerEmail: agent.ownerEmail,
      avatarUrl: agent.avatarUrl,
      metadata: agent.metadata,
      webhooks: agentJson.webhooks || null,
      createdAt: agent.createdAt,
      lastActive: agent.lastActive,
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch agent', error.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const body = await req.json();
    if (body.description) agent.description = body.description;
    if (body.metadata) agent.metadata = { ...agent.metadata, ...body.metadata };
    if (body.avatarUrl) agent.avatarUrl = body.avatarUrl;

    // Webhook config: set or remove
    if (body.webhooks === null) {
      agent.webhooks = undefined;
    } else if (body.webhooks && typeof body.webhooks === 'object') {
      const { url, secret, events } = body.webhooks;
      if (!url || typeof url !== 'string') {
        return errorResponse('Invalid webhooks.url', 'A valid URL string is required', 400);
      }
      try { new URL(url); } catch { return errorResponse('Invalid webhooks.url', 'Must be a valid URL', 400); }
      const filteredEvents = Array.isArray(events)
        ? events.filter((e: string) => VALID_EVENTS_SET.has(e))
        : [];
      agent.webhooks = { url, secret: secret || undefined, events: filteredEvents };
    }

    agent.lastActive = new Date();
    await agent.save();

    const agentJson = agent.toJSON();
    return successResponse({
      name: agent.name,
      description: agent.description,
      metadata: agent.metadata,
      webhooks: agentJson.webhooks || null,
    });
  } catch (error: any) {
    return errorResponse('Failed to update', error.message, 500);
  }
}
