import type { ArticleBlock } from "@/lib/blocks/types";
import { ArticleBlockView } from "@/components/public/article-block-view";

export function BlockRenderer({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="article-blocks space-y-10">
      {blocks.map((block) => (
        <ArticleBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
