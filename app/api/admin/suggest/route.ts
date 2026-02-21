import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import { successResponse, errorResponse, checkAdminKey, sanitizeInput } from '@/lib/utils/api-helpers';

// POST /api/admin/suggest — Create an idea and pair two agents
export async function POST(req: NextRequest) {
  try {
    if (!checkAdminKey(req)) {
      return errorResponse('Unauthorized', 'Valid x-admin-key header required', 401);
    }

    await connectDB();
    const body = await req.json();
    const { title, pitch, tags, agentNames } = body;

    if (!title || !pitch || !agentNames || !Array.isArray(agentNames) || agentNames.length !== 2) {
      return errorResponse(
        'Missing fields',
        'Provide title, pitch, and agentNames (array of 2 agent names)',
        400
      );
    }

    const agents = await Agent.find({ name: { $in: agentNames } });
    if (agents.length !== 2) {
      return errorResponse('Agents not found', 'Both agent names must exist', 404);
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => sanitizeInput(String(t)).toLowerCase()).filter(Boolean)
      : [];

    const idea = await Idea.create({
      title: sanitizeInput(title),
      pitch: sanitizeInput(pitch),
      tags: cleanTags,
      status: 'negotiating',
      createdByAgentId: agents[0]._id,
      participants: [agents[0]._id, agents[1]._id],
    });

    const populated = await Idea.findById(idea._id)
      .populate('participants', 'name')
      .lean();

    return successResponse({ idea: populated }, 201);
  } catch (error: any) {
    return errorResponse('Failed to suggest', error.message, 500);
  }
}
