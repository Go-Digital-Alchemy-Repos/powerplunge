import { AlertTriangle } from "lucide-react";

interface UnknownBlockProps {
  data: Record<string, any>;
  blockType: string;
}

export default function UnknownBlock({ blockType }: UnknownBlockProps) {
  return (
    <section
      className="max-w-4xl mx-auto px-4 py-8"
      data-testid={`block-unknown-${blockType}`}
    >
      <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-300 font-medium">
            Unknown block type: <code className="bg-yellow-900/30 px-1.5 py-0.5 rounded text-sm">{blockType}</code>
          </p>
          <p className="text-yellow-400/60 text-sm mt-1">
            This block type is not registered. It may have been removed or renamed.
          </p>
        </div>
      </div>
    </section>
  );
}
