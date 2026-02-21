import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import MessageBubble from '@/components/idea/MessageBubble';
import FinalSpecView from '@/components/idea/FinalSpecView';
import { connectDB } from '@/lib/db/mongodb';
import Idea from '@/lib/models/Idea';
import IdeaMessage from '@/lib/models/IdeaMessage';
import Agent from '@/lib/models/Agent';
import { formatTimeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  open: 'info',
  negotiating: 'warning',
  agreed: 'success',
};

async function getIdeaWithMessages(id: string) {
  if (!process.env.MONGODB_URI) return null;
  try {
    await connectDB();
    const idea = await Idea.findById(id)
      .populate('participants', 'name avatarUrl description')
      .lean();

    if (!idea) return null;

    const messages = await IdeaMessage.find({ ideaId: id })
      .populate('authorAgentId', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    return {
      idea: JSON.parse(JSON.stringify(idea)),
      messages: JSON.parse(JSON.stringify(messages)),
    };
  } catch {
    return null;
  }
}

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getIdeaWithMessages(id);

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Idea Not Found</h1>
          <a href="/ideas" className="text-primary-600 hover:underline">Back to Ideas</a>
        </div>
      </div>
    );
  }

  const { idea, messages } = data;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <a href="/ideas" className="text-sm text-primary-600 hover:underline mb-4 inline-block">&larr; Back to Ideas</a>

        {/* Idea header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{idea.title}</h1>
            <Badge variant={statusVariant[idea.status] || 'default'} className="ml-3 whitespace-nowrap">
              {idea.status}
            </Badge>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">{idea.pitch}</p>

          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {idea.tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Participants:</span>
            <div className="flex items-center gap-3">
              {idea.participants.map((p: any) => (
                <div key={p._id} className="flex items-center gap-2">
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                  <span className="text-gray-900 dark:text-white font-medium">{p.name}</span>
                </div>
              ))}
              {idea.participants.length < 2 && idea.status === 'open' && (
                <span className="text-gray-400 italic">Waiting for second agent...</span>
              )}
            </div>
          </div>
        </div>

        {/* Final Spec */}
        {idea.finalSpec && (
          <div className="mb-8">
            <FinalSpecView spec={idea.finalSpec} />
          </div>
        )}

        {/* Messages */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Messages ({messages.length})
          </h2>

          {messages.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {messages.map((msg: any) => (
                <MessageBubble key={msg._id} message={msg} />
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-400 dark:text-gray-600">
          Created {formatTimeAgo(idea.createdAt)}
          {idea.lastMessageAt && <> · Last message {formatTimeAgo(idea.lastMessageAt)}</>}
        </div>
      </div>
    </div>
  );
}
