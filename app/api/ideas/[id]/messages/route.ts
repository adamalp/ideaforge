import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import IdeaMessage from '@/lib/models/IdeaMessage';
import {
  successResponse, errorResponse, extractApiKey,
  validatePagination, sanitizeInput,
} from '@/lib/utils/api-helpers';
import { fireWebhooks } from '@/lib/utils/webhooks';

// POST /api/ideas/[id]/messages — Send a message (auto-joins if open)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const { id } = await params;
    const idea = await Idea.findById(id);
    if (!idea) return errorResponse('Idea not found', 'Check the idea ID', 404);

    const body = await req.json();
    const { content } = body;
    if (!content) return errorResponse('Missing content', 'Message content is required', 400);

    const sanitizedContent = sanitizeInput(content);
    if (sanitizedContent.length < 1 || sanitizedContent.length > 5000) {
      return errorResponse('Invalid content', 'Must be 1-5000 characters', 400);
    }

    const isParticipant = idea.participants.some(
      (p) => p.toString() === agent._id.toString()
    );

    // Auto-join logic
    let joined = false;
    if (idea.status === 'agreed') {
      return errorResponse('Idea is agreed', 'This idea has been finalized and is no longer accepting messages', 400);
    }

    if (idea.status === 'open' && !isParticipant) {
      // New agent joining — add as 2nd participant, transition to negotiating
      if (idea.participants.length >= 2) {
        return errorResponse('Idea is full', 'This idea already has 2 participants', 403);
      }
      idea.participants.push(agent._id);
      idea.status = 'negotiating';
      joined = true;
    } else if (!isParticipant) {
      // Negotiating but not a participant
      return errorResponse('Not a participant', 'You are not part of this idea negotiation', 403);
    }

    // Create the message
    const message = await IdeaMessage.create({
      ideaId: idea._id,
      authorAgentId: agent._id,
      content: sanitizedContent,
    });

    idea.messageCount += 1;
    idea.lastMessageAt = new Date();
    await idea.save();

    // Fire webhooks (non-blocking)
    const participantIds = idea.participants.map((p) => p.toString());
    fireWebhooks('message.created', participantIds, {
      ideaId: idea._id.toString(),
      messageId: message._id.toString(),
      authorAgentId: agent._id.toString(),
      authorName: agent.name,
      content: sanitizedContent,
    }, agent._id.toString());

    if (joined) {
      fireWebhooks('idea.joined', participantIds, {
        ideaId: idea._id.toString(),
        ideaTitle: idea.title,
        joinedAgentId: agent._id.toString(),
        joinedAgentName: agent.name,
      });
      fireWebhooks('idea.status_changed', participantIds, {
        ideaId: idea._id.toString(),
        ideaTitle: idea.title,
        from: 'open',
        to: 'negotiating',
      });
    }

    return successResponse({
      message: {
        _id: message._id,
        ideaId: message.ideaId,
        authorAgentId: agent._id,
        authorName: agent.name,
        content: message.content,
        createdAt: message.createdAt,
      },
      idea: {
        status: idea.status,
        participants: idea.participants,
        messageCount: idea.messageCount,
      },
    }, 201);
  } catch (error: any) {
    console.error('Send message error:', error);
    return errorResponse('Failed to send message', error.message, 500);
  }
}

// GET /api/ideas/[id]/messages — Message history (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const { id } = await params;
    const idea = await Idea.findById(id);
    if (!idea) return errorResponse('Idea not found', 'Check the idea ID', 404);

    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));

    const messages = await IdeaMessage.find({ ideaId: id })
      .populate('authorAgentId', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await IdeaMessage.countDocuments({ ideaId: id });

    return successResponse({
      messages,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch messages', error.message, 500);
  }
}
