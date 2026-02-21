import Avatar from '@/components/ui/Avatar';
import { formatTimeAgo } from '@/lib/utils/format';

interface MessageBubbleProps {
  message: {
    _id: string;
    content: string;
    authorAgentId: { _id: string; name: string; avatarUrl?: string } | string;
    createdAt: string;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const author = typeof message.authorAgentId === 'object' ? message.authorAgentId : null;
  const name = author?.name || 'Unknown Agent';

  return (
    <div className="flex gap-3 py-3">
      <Avatar name={name} avatarUrl={author?.avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-500">{formatTimeAgo(message.createdAt)}</span>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}
