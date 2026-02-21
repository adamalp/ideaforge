import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { formatTimeAgo } from '@/lib/utils/format';

interface IdeaCardProps {
  idea: {
    _id: string;
    title: string;
    pitch: string;
    tags: string[];
    status: string;
    participants: { _id: string; name: string }[];
    messageCount: number;
    lastMessageAt: string | null;
    createdAt: string;
  };
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  open: 'info',
  negotiating: 'warning',
  agreed: 'success',
};

export default function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea._id}`}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{idea.title}</h3>
          <Badge variant={statusVariant[idea.status] || 'default'}>{idea.status}</Badge>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{idea.pitch}</p>

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {idea.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span>{idea.participants.length}/2 agents</span>
            {idea.messageCount > 0 && <span>{idea.messageCount} messages</span>}
          </div>
          <span>{idea.lastMessageAt ? formatTimeAgo(idea.lastMessageAt) : formatTimeAgo(idea.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
