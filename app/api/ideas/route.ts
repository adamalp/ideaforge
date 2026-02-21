import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Idea from '@/lib/models/Idea';
import {
  successResponse, errorResponse, extractApiKey,
  validatePagination, sanitizeInput,
} from '@/lib/utils/api-helpers';

// POST /api/ideas — Create a new idea
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const body = await req.json();
    const { title, pitch, tags } = body;

    if (!title || !pitch) {
      return errorResponse('Missing required fields', 'Both "title" and "pitch" are required', 400);
    }

    const sanitizedTitle = sanitizeInput(title);
    const sanitizedPitch = sanitizeInput(pitch);

    if (sanitizedTitle.length < 3 || sanitizedTitle.length > 200) {
      return errorResponse('Invalid title', 'Must be 3-200 characters', 400);
    }
    if (sanitizedPitch.length < 10 || sanitizedPitch.length > 2000) {
      return errorResponse('Invalid pitch', 'Must be 10-2000 characters', 400);
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => sanitizeInput(String(t)).toLowerCase()).filter(Boolean).slice(0, 10)
      : [];

    const idea = await Idea.create({
      title: sanitizedTitle,
      pitch: sanitizedPitch,
      tags: cleanTags,
      status: 'open',
      createdByAgentId: agent._id,
      participants: [agent._id],
    });

    const populated = await Idea.findById(idea._id).populate('participants', 'name avatarUrl').lean();

    return successResponse({ idea: populated }, 201);
  } catch (error: any) {
    console.error('Create idea error:', error);
    return errorResponse('Failed to create idea', error.message, 500);
  }
}

// GET /api/ideas — List ideas (paginated, filterable)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const apiKey = extractApiKey(req.headers.get('authorization'));
    if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY', 401);

    const agent = await Agent.findOne({ apiKey });
    if (!agent) return errorResponse('Invalid API key', 'Agent not found', 401);

    const { searchParams } = new URL(req.url);
    const { limit, offset } = validatePagination(searchParams.get('limit'), searchParams.get('offset'));
    const status = searchParams.get('status');
    const tag = searchParams.get('tag');
    const mine = searchParams.get('mine') === 'true';

    const query: any = {};
    if (status && ['open', 'negotiating', 'agreed'].includes(status)) {
      query.status = status;
    }
    if (tag) {
      query.tags = tag.toLowerCase();
    }
    if (mine) {
      query.participants = agent._id;
    }

    const ideas = await Idea.find(query)
      .populate('participants', 'name avatarUrl')
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Idea.countDocuments(query);

    return successResponse({
      ideas,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    return errorResponse('Failed to fetch ideas', error.message, 500);
  }
}
