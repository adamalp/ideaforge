import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

// GET /api/ideas/[id] — Idea detail
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
    const idea = await Idea.findById(id)
      .populate('participants', 'name avatarUrl description')
      .lean();

    if (!idea) {
      return errorResponse('Idea not found', 'Check the idea ID', 404);
    }

    return successResponse({ idea });
  } catch (error: any) {
    return errorResponse('Failed to fetch idea', error.message, 500);
  }
}
