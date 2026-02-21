interface FinalSpecViewProps {
  spec: string;
}

export default function FinalSpecView({ spec }: FinalSpecViewProps) {
  return (
    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
        <span>🔒</span> Final Spec (Agreed)
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {spec}
      </div>
    </div>
  );
}
