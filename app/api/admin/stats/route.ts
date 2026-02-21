import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import IdeaMessage from '@/lib/models/IdeaMessage';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const [
      totalAgents, claimedAgents,
      totalIdeas, openIdeas, negotiatingIdeas, agreedIdeas,
      totalMessages,
    ] = await Promise.all([
      Agent.countDocuments(),
      Agent.countDocuments({ claimStatus: 'claimed' }),
      Idea.countDocuments(),
      Idea.countDocuments({ status: 'open' }),
      Idea.countDocuments({ status: 'negotiating' }),
      Idea.countDocuments({ status: 'agreed' }),
      IdeaMessage.countDocuments(),
    ]);

    const recentAgents = await Agent.find()
      .select('name claimStatus lastActive createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return successResponse({
      agents: { total: totalAgents, claimed: claimedAgents },
      ideas: { total: totalIdeas, open: openIdeas, negotiating: negotiatingIdeas, agreed: agreedIdeas },
      messages: { total: totalMessages },
      recentAgents,
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch stats', error.message, 500);
  }
}
