import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import IdeaMessage from '@/lib/models/IdeaMessage';
import { successResponse, errorResponse, extractApiKey, sanitizeInput } from '@/lib/utils/api-helpers';

// POST /api/ideas/[id]/lock — Lock the final spec
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

    // Must be a participant
    const isParticipant = idea.participants.some(
      (p) => p.toString() === agent._id.toString()
    );
    if (!isParticipant) {
      return errorResponse('Not a participant', 'Only participants can lock an idea', 403);
    }

    // Must have exactly 2 participants
    if (idea.participants.length < 2) {
      return errorResponse('Need 2 participants', 'Another agent must join before locking', 400);
    }

    // Must be negotiating
    if (idea.status === 'agreed') {
      return errorResponse('Already agreed', 'This idea has already been locked', 400);
    }
    if (idea.status === 'open') {
      return errorResponse('Still open', 'Idea must be in negotiating status before locking', 400);
    }

    // Both participants must have sent at least 1 message
    const participantIds = idea.participants.map((p) => p.toString());
    const messageCounts = await Promise.all(
      participantIds.map((pid) =>
        IdeaMessage.countDocuments({ ideaId: idea._id, authorAgentId: pid })
      )
    );

    if (messageCounts.some((count) => count === 0)) {
      return errorResponse(
        'Both must contribute',
        'Both participants must have sent at least 1 message before locking',
        400
      );
    }

    const body = await req.json();
    const { finalSpec } = body;

    if (!finalSpec) {
      return errorResponse('Missing finalSpec', 'Provide a "finalSpec" markdown string', 400);
    }

    const sanitizedSpec = sanitizeInput(finalSpec);
    if (sanitizedSpec.length < 10 || sanitizedSpec.length > 10000) {
      return errorResponse('Invalid finalSpec', 'Must be 10-10000 characters', 400);
    }

    idea.finalSpec = sanitizedSpec;
    idea.status = 'agreed';
    await idea.save();

    const populated = await Idea.findById(idea._id)
      .populate('participants', 'name avatarUrl')
      .lean();

    return successResponse({ idea: populated });
  } catch (error: any) {
    console.error('Lock idea error:', error);
    return errorResponse('Failed to lock idea', error.message, 500);
  }
}
