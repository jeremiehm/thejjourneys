# Notion-Style Article Editor — Complete Reference

> **Scope:** Admin article editing UI (`/admin/articles/[id]/edit`).  
> **Important:** This is a **custom Notion-inspired block editor**. It does **not** use Notion’s API, embeds, or official SDK. “Notion” here means UX patterns (blocks, slash menu, drag handles, side-by-side columns).

---

## Table of contents

1. [High-level architecture](#1-high-level-architecture)
2. [Data model](#2-data-model)
3. [Component hierarchy](#3-component-hierarchy)
4. [TipTap layer (`NotionEditor`)](#4-tiptap-layer-notioneditor)
5. [Block layer (`NotionBlockEditor`)](#5-block-layer-notionblockeditor)
6. [Keyboard & Enter / Backspace behavior](#6-keyboard--enter--backspace-behavior)
7. [Slash commands](#7-slash-commands)
8. [Links (Notion-style)](#8-links-notion-style)
9. [Lists & rich text](#9-lists--rich-text)
10. [Bubble menu & inline formatting](#10-bubble-menu--inline-formatting)
11. [Drag and drop](#11-drag-and-drop)
12. [Multi-column rows](#12-multi-column-rows)
13. [Markdown round-trip](#13-markdown-round-trip)
14. [Block chrome & context menu](#14-block-chrome--context-menu)
15. [Non-text block types](#15-non-text-block-types)
16. [Page shell (`NotionArticlePage`)](#16-page-shell-notionarticlepage)
17. [AI integration](#17-ai-integration)
18. [Persistence & state flow](#18-persistence--state-flow)
19. [CSS & styling](#19-css--styling)
20. [Public site rendering](#20-public-site-rendering)
21. [File reference](#21-file-reference)
22. [Common change patterns](#22-common-change-patterns)
23. [Known limitations & pitfalls](#23-known-limitations--pitfalls)

---

## 1. High-level architecture

The editor has **two nested layers**:

```
NotionArticlePage (React state: title, blocks[], metadata)
    └── NotionBlockEditor (block list, DnD, slash menu at block level)
            └── NotionEditor × N (one TipTap instance per text block)
                    └── TipTap / ProseMirror document
```

| Layer | Responsibility |
|-------|----------------|
| **Article page** | Owns `ArticleBlock[]`, autosave, publish, AI panel, cover, properties |
| **Block editor** | Splits article into leaf blocks + rows; drag/drop; block CRUD; coordinates slash menu |
| **TipTap editor** | Rich text inside a single `text` block; markdown stored in `block.data.markdown` |

**Storage format:** Each `text` block stores **markdown** in `data.markdown`. TipTap edits HTML internally; `onUpdate` converts HTML → markdown via Turndown.

**Not in the block editor:** Legacy/rich block types (`gallery`, `map`, `timeline`, etc.) exist in `ArticleBlock` union but are **normalized to empty text** when opened in the Notion editor (`normalizeEditorBlocks`). Only `text`, `image`, `divider`, `quote`, and `row` are fully supported in admin editing today.

---

## 2. Data model

### 2.1 `ArticleBlock` (persisted in Supabase `articles.content`)

Defined in `lib/blocks/types.ts`.

| Type | `data` shape | Editable in Notion UI |
|------|--------------|----------------------|
| `text` | `{ markdown: string, fullWidth?: boolean }` | Yes — TipTap |
| `image` | `{ url, caption?, alt?, widthPercent?, fullWidth? }` | Yes — `ImageBlock` |
| `divider` | `{ label?, fullWidth? }` | Yes — static `<hr>` |
| `quote` | `{ text, attribution?, fullWidth? }` | Yes — `<textarea>` |
| `row` | `{ children: RowSlot[], fullWidth? }` | Yes — flex columns |
| `columns` | deprecated | Migrated to `row` on load |
| `gallery`, `map`, `video`, … | various | Coerced to `text` on load |

### 2.2 `EditorBlock` (in-memory editor shape)

Defined in `lib/blocks/editor-types.ts`.

```ts
type EditorLeafBlock = TextBlock | ImageBlock | DividerBlock | QuoteBlock;
type EditorBlock = EditorLeafBlock | RowBlock;
```

- **`normalizeEditorBlocks(blocks)`** — converts `columns` → `row`, coerces unknown types → empty `text`
- **`serializeEditorBlocks(blocks)`** — casts back to `ArticleBlock[]` for save

### 2.3 Row model

```ts
type RowSlot = {
  slotId: string;
  flex: number;        // 0–1, sum = 1 per row
  block: RowChildBlock; // text | image | divider | quote
};
```

Rows are created when dragging a block **left** or **right** onto another block (`applyDrop` → `dropHorizontal`).

---

## 3. Component hierarchy

```
NotionArticlePage
├── TitleInput
├── ArticleCover (banner / above_title / below_title)
├── PropertyRow (collection, author, status, dates…)
├── NotionBlockEditor
│   ├── DndContext (@dnd-kit/core)
│   ├── RootBlockNode (per top-level block)
│   │   ├── LeafBlockNode → BlockWrapper → BlockContent
│   │   │   └── NotionEditor | ImageBlock | <hr> | <textarea>
│   │   └── RowDropTarget → FlexRowWrapper → LeafBlockNode × slots
│   ├── SlashMenu (shared, parent-controlled)
│   └── DragOverlay
├── AiPanel (desktop) / Sheet (mobile)
└── RevisionHistory tab
```

### Key props wiring (`NotionBlockEditor` → `NotionEditor`)

| Callback | Purpose |
|----------|---------|
| `onChange(blocks)` | Serializes and bubbles to article page |
| `onNewBlock({ markdown? })` | Enter created a sibling text block |
| `onDeleteBlock()` | Backspace deleted empty block |
| `onRegisterEditor(blockId, editor)` | Maps block ID → TipTap instance (focus, AI) |
| `onSlashTrigger(state, getRect)` | Parent shows unified slash menu |

---

## 4. TipTap layer (`NotionEditor`)

**File:** `components/admin/NotionEditor/NotionEditor.tsx`

### 4.1 Extensions (in load order)

| Extension | Package / file | Role |
|-----------|----------------|------|
| **StarterKit** | `@tiptap/starter-kit` | paragraph, headings 1–3, bold, italic, strike, code, blockquote, bulletList, orderedList, horizontalRule, hardBreak, history |
| **Underline** | `@tiptap/extension-underline` | underline mark |
| **Link** | `@tiptap/extension-link` | `autolink`, `linkOnPaste`, `openOnClick: false` |
| **Image** | `@tiptap/extension-image` | inline images inside text block |
| **Youtube** | `@tiptap/extension-youtube` | video embeds |
| **Highlight** | `@tiptap/extension-highlight` | highlight mark |
| **Typography** | `@tiptap/extension-typography` | smart quotes, dashes, etc. |
| **TaskList / TaskItem** | `@tiptap/extension-task-list` | checkboxes (`nested: true`) |
| **Callout** | custom `Node` in `NotionEditor.tsx` | `div[data-type="callout"]` with 💡 icon |
| **Placeholder** | `@tiptap/extension-placeholder` | “Type '/' for commands” in block mode |
| **notionLinkShortcut** | `link-shortcut.ts` | `Mod-k` opens link input |
| **notionBlockEnter** | `notion-block-enter.ts` | block-mode Enter → new sibling block |
| **notionBlockBackspace** | `notion-block-backspace.ts` | empty block → delete + focus previous |

### 4.2 Modes

| Prop | Effect |
|------|--------|
| `blockMode={true}` | Enables Enter/Backspace extensions; shorter placeholder; class `notion-editor-content--block` |
| `blockId` + `onRegisterEditor` | Registers editor in parent `Map<blockId, Editor>` |
| `onSlashTrigger` | Delegates slash menu to `NotionBlockEditor` (single menu for all blocks) |

### 4.3 Content sync

- **Initial:** `content: markdownToHtml(value)` (`lib/markdown-editor.ts` — `marked` with GFM)
- **On update:** `onChange(htmlToMarkdown(ed.getHTML()))` — Turndown
- External `value` changes from parent are **not** continuously re-synced into TipTap after mount (standard controlled-editor caveat); AI apply / restore triggers `setBlocks` which remounts or updates via parent.

### 4.4 Custom Callout node

```ts
// NotionEditor.tsx — Node.create({ name: "callout", ... })
// HTML: <div data-type="callout" class="notion-callout">
//         <div class="notion-callout-icon">💡</div>
//         <div class="notion-callout-body">…</div>
//       </div>
```

Inserted via slash command `callout` or `applySlashToEditor`.

### 4.5 Media dialog

Built-in dialog for image upload (Supabase via `uploadAdminImage`) or URL, and YouTube/Vimeo embed — separate from **image blocks** at the block level.

---

## 5. Block layer (`NotionBlockEditor`)

**File:** `components/admin/NotionEditor/NotionBlockEditor.tsx`

### 5.1 State

- `editorBlocks` — derived from `normalizeEditorBlocks(blocks)` prop
- `editorsByBlockId` — `ref Map<string, Editor>` for focus management
- `pendingFocusBlockId` — after block delete, focus previous block post-render
- `slashState` — `{ blockId, query, rect }` for shared slash menu
- DnD: `activeId`, `dropState` (`overId` + `zone`)

### 5.2 Core operations (`lib/blocks/content-ops.ts`)

| Function | Description |
|----------|-------------|
| `findBlockLocation(blocks, id)` | `{ kind: "root" \| "row", index, … }` |
| `getPreviousLeafBlockId(blocks, id)` | Previous sibling for focus after delete |
| `removeBlockAt(blocks, loc)` | Removes block; collapses single-child rows |
| `duplicateBlock(blocks, id)` | Clones block below with new `id` |
| `applyDrop(blocks, activeId, overId, zone)` | DnD move / row creation |
| `detectDropZone(rect, x, y)` | `"before" \| "after" \| "left" \| "right"` |
| `updateRowFlexes(blocks, rowId, flexes)` | Column resize with snap ratios |
| `snapRowFlexes(count, flexes)` | Snaps to 50/50, 33/67, etc. |
| `countLeafBlocks(blocks)` | Prevents deleting last block |
| `createEmptyLeaf(type)` | Factory via `createArticleBlock` |

### 5.3 Focus after block delete

```ts
// deleteLeafBlock:
pendingFocusBlockId.current = previousId;
setEditorBlocks(removeBlockAt(...));

// useEffect on editorBlocks:
focusBlock(blockId) // retries up to 8 rAFs until editor is registered
editor.chain().focus("end").run();
```

### 5.4 Insert flows

| Action | Handler |
|--------|---------|
| Click **+** on block chrome | `openSlashForNewBlock` — inserts empty text block, opens slash menu |
| Enter at end of text block | `insertTextBlockAfter` via `onNewBlock` |
| Slash **image** / **divider** at block level | `applySlashItem` transforms entire leaf block type |

---

## 6. Keyboard & Enter / Backspace behavior

**Files:** `notion-block-enter.ts`, `notion-block-backspace.ts`

### 6.1 Enter (`notionBlockEnter`, priority 1000)

| Context | Behavior |
|---------|----------|
| **Inside list** (bullet/ordered/task), empty item | `liftListItem` (exit list) — TipTap default chain |
| **Inside list**, non-empty | `return false` — TipTap splits list item |
| **Heading** | New empty sibling block |
| **Code block** | `return false` — newline inside code |
| **Paragraph**, only empty para | `onNewBlock({})` |
| **Paragraph**, cursor mid-line | Split: text after cursor → new block markdown |
| **Paragraph**, cursor at end, content after | Tail content → new block |
| **Paragraph**, cursor at end, no tail | `onNewBlock({})` |
| **Shift-Enter** | Hard break (`<br>`) |

### 6.2 Backspace (`notionBlockBackspace`, priority 1001)

| Condition | Behavior |
|-----------|----------|
| Selection not empty | ignored |
| Block **visually empty** (no text, including empty lists) | `onDeleteBlock()` → removes leaf, focuses previous |
| Last remaining leaf block | delete blocked (`countLeafBlocks <= 1`) |

**Visually empty** (`isEditorVisuallyEmpty`):

- `doc.textContent.trim()` is empty
- OR single empty paragraph
- Works for empty bullet/ordered/task structures

### 6.3 Shift from Notion UX not implemented

- **Merge with previous block** on Backspace at start of non-empty block — not implemented
- **Merge blocks** when deleting between two paragraphs — handled by Enter split, not Backspace merge

---

## 7. Slash commands

### 7.1 Detection (`slash-command.ts`)

`getSlashMatch(editor)`:

- Looks at text before cursor **on current parent node** (line)
- Finds last `/` without spaces/newlines after it
- Returns `{ query, slashFrom, slashTo }`

Triggered on every `onUpdate` / `onSelectionUpdate` in `NotionEditor`.

### 7.2 Menu UI (`SlashMenu.tsx`)

- Filters `SLASH_ITEMS` (`slash-items.ts`)
- Keyboard: ↑↓ navigate, Enter select, Escape close (window listener in block editor)
- Positioned via `getSlashMenuRect` (cursor coords)

### 7.3 Items (`slash-items.ts`)

| ID | Applies (in TipTap via `applySlashToEditor`) |
|----|-----------------------------------------------|
| `paragraph` | `setParagraph()` |
| `h1`, `h2`, `h3` | `setHeading({ level })` |
| `quote` | `toggleBlockquote()` |
| `code` | `toggleCodeBlock()` |
| `divider` | `setHorizontalRule()` (in-block HR) OR block-level divider via `applySlashItem` |
| `bullet` | `toggleBulletList()` |
| `ordered` | `toggleOrderedList()` |
| `task` | `toggleTaskList()` |
| `image` | Opens media dialog OR block-level image transform |
| `video` | Opens YouTube dialog |
| `callout` | Inserts callout node |
| `alert` | Listed but **not implemented** in `applySlashToEditor` |

**Block-level slash** (`applySlashItem` in `NotionBlockEditor`): `image` and `divider` replace the entire leaf block type.

### 7.4 Markdown input rules (TipTap defaults)

Without slash, StarterKit supports:

- `- `, `* `, `+ ` → bullet list
- `1. ` → ordered list
- `# ` → heading (if enabled in StarterKit)

---

## 8. Links (Notion-style)

| Feature | Implementation |
|---------|----------------|
| **Cmd/Ctrl+K** | `createLinkShortcutExtension` → opens `LinkInputFloating` |
| **Bubble menu Link** | Same floating input |
| **Paste URL on selection** | `Link.configure({ linkOnPaste: true })` |
| **Autolink typed URLs** | `autolink: true` |
| **Apply** | `setLink({ href })` on selection; inserts linked text if selection empty |
| **Remove** | Empty URL → `unsetLink()` |

**File:** `LinkInputFloating.tsx` — fixed position near cursor, Enter to apply, Escape to close.

**Note:** `href` without protocol gets `https://` prefix.

---

## 9. Lists & rich text

### In-editor CSS (`app/globals.css` → `.notion-editor-content`)

- `ul:not([data-type="taskList"])` — `list-style: disc`
- `ol` — `list-style: decimal`
- `li > p { margin: 0 }` — tight list items
- Task lists — custom flex layout, strikethrough when checked
- Links — blue underline

### In markdown

- GFM lists round-trip through `marked` + Turndown
- Task lists depend on TipTap task list HTML ↔ Turndown rules (default Turndown may simplify)

---

## 10. Bubble menu & inline formatting

**File:** `BubbleMenu.tsx` — uses `@tiptap/react/menus` `BubbleMenu`

| Control | TipTap command |
|---------|----------------|
| Bold | `toggleBold()` |
| Italic | `toggleItalic()` |
| Underline | `toggleUnderline()` |
| Strike | `toggleStrike()` |
| Link | Opens link editor (see §8) |
| H1 / H2 / H3 | `toggleHeading({ level })` |
| Bulleted list | `toggleBulletList()` |
| Quote | `toggleBlockquote()` |
| Inline AI | `InlineAiMenu` component |

---

## 11. Drag and drop

**Library:** `@dnd-kit/core`

| Piece | Role |
|-------|------|
| `useDraggable` | Block drag handle (⠿ button) |
| `useDroppable` | Drop targets per block / row |
| `detectDropZone` | Mouse position → zone |
| `DragIndicator` | Visual line before/after/left/right |
| `applyDrop` | Mutates `editorBlocks` |

### Drop zones (relative to target block rect)

```
relX < 0.3        → left  (create/join row)
relX > 0.7        → right (create/join row)
relY < 0.3        → before
else              → after
```

---

## 12. Multi-column rows

**File:** `FlexRowWrapper.tsx`

- Renders children with `flex: slot.flex`
- Hover shows resize handles between columns
- Drag resize → `onFlexChange` → `updateRowFlexes` + `snapRowFlexes`
- Min column width ~15%

**Preset factory:** `createRowBlock(presetId)` in `lib/blocks/defaults.ts` uses `COLUMN_PRESETS` from `layout-presets.ts`.

---

## 13. Markdown round-trip

**File:** `lib/markdown-editor.ts`

```ts
markdownToHtml(markdown)  // marked, GFM, breaks
htmlToMarkdown(html)      // TurndownService, atx headings
```

**Partial extraction:** `slice-markdown.ts`

- `sliceToMarkdown(editor, from, to)` — used when Enter splits a paragraph
- Serializes ProseMirror fragment → DOM → Turndown

**Implication for AI:** Body content for prompts is often serialized via `serializeArticleBlocksForAi` (`lib/ai/article-serializer.ts`), not raw TipTap HTML.

---

## 14. Block chrome & context menu

**File:** `BlockWrapper.tsx`

Each leaf block shows on hover:

| Control | Action |
|---------|--------|
| **+** | Add block below (opens slash on new block) |
| **⠿** | Drag; click without drag opens context menu |

**Context menu actions** (`BlockContextMenuAction`):

| Action | Effect |
|--------|--------|
| `delete` | `removeBlockAt` |
| `duplicate` | `duplicateBlock` |
| `transform` → text/image | `createEmptyLeaf(type)` |
| `copyLink` | `#block-{id}` URL to clipboard |

**Action button alignment:** `block-actions-align.ts` measures first line / heading cap height so + and ⠿ align with text (Notion-like).

---

## 15. Non-text block types

### Image block (`ImageBlock.tsx`)

- Upload via `uploadAdminImage` → Supabase storage
- URL tab, caption, width resize (25–100%)
- Uses `AdminImage` (native `<img>`, not `next/image` — Supabase URLs)

### Divider block

- Renders `<hr>` in `BlockContent`
- No inline editing

### Quote block

- Simple `<textarea>` for `data.text` (not TipTap)

### In-text image / video (inside TipTap)

- Slash or media dialog in `NotionEditor`
- Stored inside `markdown` string

---

## 16. Page shell (`NotionArticlePage`)

**File:** `components/admin/NotionArticlePage.tsx`

| Concern | Implementation |
|---------|----------------|
| Initial blocks | `[createArticleBlock("text")]` if empty |
| Autosave | Debounced `autosaveArticle` server action |
| Publish | `saveArticle` — stays on edit page, toast via `sessionStorage` |
| AI | `AiEditorProvider` wraps editor |
| Editor ref | First text block’s TipTap instance |
| Revisions | `RevisionHistory` tab, restore actions |
| View site / View article | Header links |

---

## 17. AI integration

**File:** `components/admin/ai/AiEditorContext.tsx`

| Feature | How it touches the editor |
|---------|---------------------------|
| **Inline edit** | `startInlineEdit(action, editor, blockId)` — uses `sliceToMarkdown` on selection |
| **Enhance SEO** | Replaces `blocks` via `setBlocks`; creates revision “Before SEO enhance” |
| **Draft / structure** | `structureSectionsToBlocks` → `setBlocks` |
| **Editor registry** | `registerEditor(blockId, editor)` — same map pattern as block editor |
| **scrollToBlock** | `document.querySelector([data-block-id="…"])` |

AI panel: `components/admin/ai/AiPanel.tsx`  
Inline menu: `components/admin/ai/InlineAiMenu.tsx`

---

## 18. Persistence & state flow

```
User edits TipTap
  → onChange(markdown)
  → updateBlock in NotionBlockEditor
  → setEditorBlocks → serializeEditorBlocks
  → onChange(ArticleBlock[]) in NotionArticlePage
  → setBlocks
  → debounced autosaveArticle({ content: blocks, … })
  → Supabase articles.content (JSONB)
```

**Revisions:** `lib/article-revisions.ts` — snapshot on saves (used by History tab).

**IDs:** `createId()` — `crypto.randomUUID()` or random fallback.

---

## 19. CSS & styling

Primary stylesheet: `app/globals.css`

| Class | Purpose |
|-------|---------|
| `.notion-page` | Article page layout |
| `.notion-block-editor` | Block list container |
| `.notion-block` | Single block wrapper |
| `.block-row`, `.block-actions`, `.block-content` | Chrome layout |
| `.notion-editor-content` | TipTap typography |
| `.notion-editor-content--block` | Min height per block |
| `.notion-chrome-btn` | + and ⠿ buttons |
| `.notion-slash-menu` | Slash popup |
| `.notion-flex-row` | Column row |
| `.notion-callout` | Callout block |

Admin font: Inter via `app/admin/layout.tsx` + `.admin-theme`.

---

## 20. Public site rendering

**File:** `components/public/article-block-view.tsx`

- Renders `ArticleBlock[]` for visitors
- Text blocks: markdown → HTML (react-markdown or similar)
- Image blocks without URL are hidden
- Row blocks: flex layout mirroring admin
- **Not** using TipTap on public site

---

## 21. File reference

### Core editor

| File | Role |
|------|------|
| `components/admin/NotionArticlePage.tsx` | Page shell, state, autosave, AI provider |
| `components/admin/NotionEditor/NotionBlockEditor.tsx` | Block list, DnD, slash orchestration, focus |
| `components/admin/NotionEditor/NotionEditor.tsx` | TipTap instance, extensions, media dialog |
| `components/admin/NotionEditor/notion-block-enter.ts` | Enter → new block / split |
| `components/admin/NotionEditor/notion-block-backspace.ts` | Backspace → delete empty block |
| `components/admin/NotionEditor/slash-command.ts` | Slash detect + apply |
| `components/admin/NotionEditor/slash-items.ts` | Slash menu item definitions |
| `components/admin/NotionEditor/SlashMenu.tsx` | Slash menu UI |
| `components/admin/NotionEditor/slice-markdown.ts` | Partial doc → markdown |
| `components/admin/NotionEditor/BubbleMenu.tsx` | Selection formatting menu |
| `components/admin/NotionEditor/LinkInputFloating.tsx` | Cmd+K link UI |
| `components/admin/NotionEditor/link-shortcut.ts` | Mod-k extension |
| `components/admin/NotionEditor/BlockWrapper.tsx` | Block chrome + context menu |
| `components/admin/NotionEditor/block-actions-align.ts` | Align + / ⠿ to text |
| `components/admin/NotionEditor/FlexRowWrapper.tsx` | Column resize UI |
| `components/admin/NotionEditor/DragIndicator.tsx` | Drop zone indicator |
| `components/admin/NotionEditor/ImageBlock.tsx` | Image leaf block |
| `components/admin/NotionEditor/TitleInput.tsx` | Article title |
| `components/admin/NotionEditor/ArticleCover.tsx` | Cover image |
| `components/admin/NotionEditor/PropertyRow.tsx` | Metadata fields |

### Block data & ops

| File | Role |
|------|------|
| `lib/blocks/types.ts` | `ArticleBlock`, `Article`, `RowBlock`, … |
| `lib/blocks/editor-types.ts` | `EditorBlock`, normalize/serialize |
| `lib/blocks/content-ops.ts` | DnD, delete, duplicate, row flex |
| `lib/blocks/defaults.ts` | `createId`, `createArticleBlock`, `createRowBlock` |
| `lib/blocks/layout-presets.ts` | Column presets for new rows |
| `lib/markdown-editor.ts` | marked + Turndown |

### Tests

| File | Covers |
|------|--------|
| `components/admin/NotionEditor/slash-command.test.ts` | Slash matching |
| `components/admin/NotionEditor/block-actions-align.test.ts` | Action alignment |

### AI (editor-adjacent)

| File | Role |
|------|------|
| `components/admin/ai/AiEditorContext.tsx` | AI state + editor registry |
| `components/admin/ai/AiPanel.tsx` | Audit, enhance SEO, draft UI |
| `components/admin/ai/InlineAiMenu.tsx` | Bubble menu AI actions |
| `lib/ai/article-serializer.ts` | Blocks → text for prompts |

---

## 22. Common change patterns

### Add a new slash command

1. Add item to `SLASH_ITEMS` in `slash-items.ts`
2. Handle in `applySlashToEditor` (`slash-command.ts`)
3. If it changes **block type** (not inline), also handle in `applySlashItem` (`NotionBlockEditor.tsx`)

### Add a new leaf block type

1. Add to `EditorLeafBlock` in `editor-types.ts` (and `types.ts` if persisted)
2. Handle in `BlockContent` switch (`NotionBlockEditor.tsx`)
3. Add to `isLeafBlock`, `createArticleBlock`, context menu transform options
4. Add public renderer in `article-block-view.tsx`

### Add a TipTap extension

1. Install `@tiptap/extension-*` if needed
2. Add to `extensions` array in `NotionEditor.tsx`
3. Add CSS under `.notion-editor-content` if visual
4. Verify Turndown round-trip; add custom Turndown rule if needed

### Change Enter / Backspace behavior

Edit `notion-block-enter.ts` / `notion-block-backspace.ts` — keep priority above/below TipTap defaults as needed (`priority: 1000+`).

### Fix focus after structural change

Use `pendingFocusBlockId` pattern in `NotionBlockEditor` — set before `setEditorBlocks`, focus in `useEffect` depending on `editorBlocks`.

---

## 23. Known limitations & pitfalls

| Topic | Detail |
|-------|--------|
| **Not Notion API** | No import from Notion; cannot sync with Notion workspaces |
| **Legacy block types** | gallery/map/timeline/etc. lost on edit unless migrated |
| **Single TipTap doc per text block** | No cross-block text selection |
| **Controlled value** | TipTap not reset on every external `value` change — AI bulk replace uses `setBlocks` remount |
| **Duplicate extensions warning** | Console may warn about duplicate `link`/`underline` — investigate if adding more extensions |
| **`alert` slash item** | Defined but not wired |
| **Block merge on Backspace** | Not implemented (Notion merges into previous block) |
| **HR via slash in text block** | Creates in-document `<hr>`, distinct from `divider` block type |
| **Images** | Supabase URLs must use `AdminImage` / `AppImage`, not optimized `next/image` |
| **lang default** | Articles default `en`; migration `20260712210000_article_lang_default_en.sql` |

---

## Quick mental model (for Claude)

> **One article = array of blocks.**  
> **Each text block = one TipTap editor storing markdown.**  
> **Enter splits blocks; Backspace on empty deletes and focuses previous.**  
> **Slash `/` transforms content or block type.**  
> **Drag ⠿ reorders; drag left/right builds columns.**  
> **Everything serializes to JSONB `articles.content`.**

When unsure, start reading from `NotionArticlePage.tsx` → `NotionBlockEditor.tsx` → `NotionEditor.tsx`, then the specific extension or `content-ops.ts` function involved.
