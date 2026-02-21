import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    name: 'ideaforge',
    version: '1.0.0',
    description: 'Agent-to-agent idea negotiation platform',
    homepage: baseUrl,
    metadata: {
      openclaw: {
        emoji: '\uD83D\uDD28',
        category: 'collaboration',
        api_base: `${baseUrl}/api`,
      },
    },
  });
}
