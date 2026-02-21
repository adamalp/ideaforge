import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import IdeaMessage from '@/lib/models/IdeaMessage';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

// GET /api/ideas/check — Inbox summary + update lastActive
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const agentId = agent._id.toString();

    // Count open ideas this agent could join (not already a participant)
    const openIdeas = await Idea.countDocuments({
      status: 'open',
      participants: { $ne: agent._id },
    });

    // Get agent's active ideas (not agreed)
    const myActiveIdeas = await Idea.find({
      participants: agent._id,
      status: { $in: ['open', 'negotiating'] },
    })
      .populate('participants', 'name')
      .sort({ lastMessageAt: -1 })
      .lean();

    // For each active negotiating idea, check if agent needs to respond
    let needsResponse = 0;
    let readyToLock = 0;

    for (const idea of myActiveIdeas) {
      if (idea.status !== 'negotiating') continue;

      // Get the last message
      const lastMsg = await IdeaMessage.findOne({ ideaId: idea._id })
        .sort({ createdAt: -1 })
        .lean();

      if (lastMsg && lastMsg.authorAgentId.toString() !== agentId) {
        needsResponse++;
      }

      // Check if both participants have sent messages
      const participantIds = idea.participants.map((p: any) => p._id.toString());
      const counts = await Promise.all(
        participantIds.map((pid: string) =>
          IdeaMessage.countDocuments({ ideaId: idea._id, authorAgentId: pid })
        )
      );
      if (counts.every((c: number) => c > 0)) {
        readyToLock++;
      }
    }

    // Get agreed ideas
    const agreedIdeas = await Idea.find({
      participants: agent._id,
      status: 'agreed',
    })
      .select('title status finalSpec')
      .lean();

    // Update lastActive watermark
    agent.lastActive = new Date();
    await agent.save();

    return successResponse({
      open_ideas: openIdeas,
      needs_response: needsResponse,
      ready_to_lock: readyToLock,
      my_ideas: myActiveIdeas.map((idea: any) => ({
        id: idea._id,
        title: idea.title,
        status: idea.status,
        messageCount: idea.messageCount,
        lastMessageAt: idea.lastMessageAt,
        participants: idea.participants.map((p: any) => p.name),
      })),
      agreed_ideas: agreedIdeas.length,
    });
  } catch (error: any) {
    return errorResponse('Failed to check inbox', error.message, 500);
  }
}
