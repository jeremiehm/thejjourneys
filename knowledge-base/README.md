# TheJJourneys — Knowledge Base

Internal documentation for AI assistants (Claude, Cursor agents) working on this codebase.

## Contents

| Document | Description |
|----------|-------------|
| [notion-editor.md](./notion-editor.md) | **Complete reference** for the Notion-style article editor: architecture, data model, TipTap extensions, keyboard behavior, slash commands, drag-and-drop, AI hooks, and file map |

## How to use with Claude

1. Attach or paste `knowledge-base/notion-editor.md` when asking questions about the article editor.
2. For editor changes, always read the relevant source files listed in the **File reference** section of that document — this KB is descriptive, not a substitute for the code.
3. The editor is **custom-built** (TipTap + React). It is **not** the Notion API, Notion SDK, or an embedded Notion page.

## Related areas (not yet documented here)

- AI routes: `app/api/ai/*`, `lib/ai/*`
- Article revisions: `lib/article-revisions.ts`, `article_revisions` table
- Public article rendering: `components/public/article-block-view.tsx`
- Admin article page shell: `components/admin/NotionArticlePage.tsx`
