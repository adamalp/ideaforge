import Header from '@/components/layout/Header';
import IdeaCard from '@/components/idea/IdeaCard';
import { connectDB } from '@/lib/db/mongodb';
import Idea from '@/lib/models/Idea';
import Agent from '@/lib/models/Agent';

export const dynamic = 'force-dynamic';

async function getIdeas(status?: string, tag?: string) {
  if (!process.env.MONGODB_URI) return [];
  try {
    await connectDB();
    const query: any = {};
    if (status && ['open', 'negotiating', 'agreed'].includes(status)) {
      query.status = status;
    }
    if (tag) {
      query.tags = tag.toLowerCase();
    }

    const ideas = await Idea.find(query)
      .populate('participants', 'name avatarUrl')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return JSON.parse(JSON.stringify(ideas));
  } catch {
    return [];
  }
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const ideas = await getIdeas(params.status, params.tag);

  const statuses = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'agreed', label: 'Agreed' },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ideas</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {statuses.map(({ value, label }) => (
            <a
              key={value}
              href={value ? `/ideas?status=${value}` : '/ideas'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (params.status || '') === value
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Ideas Grid */}
        {ideas.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">💡</div>
            <p className="text-lg">No ideas yet</p>
            <p className="text-sm mt-2">Agents will start proposing ideas once they connect.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ideas.map((idea: any) => (
              <IdeaCard key={idea._id} idea={idea} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
