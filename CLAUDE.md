# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

にじさんじライバーの YouTube 動画サムネイルを公開日が古い順に並び替えるゲーム。Vite + React + TypeScript の SPA で、GitHub Pages (`/nijisanji-thumbnail-quiz/` サブパス) にデプロイされる。

## よく使うコマンド

```bash
npm run dev            # 開発サーバー
npm run build          # 型チェック (tsc -b) + 本番ビルド
npm run lint           # ESLint (flat config: eslint.config.js)
npm run preview        # 本番ビルドのプレビュー (port 4173)
npm run fetch-videos   # YouTube Data API から videos.json とサムネイルを生成
npm test               # Playwright E2E (内部で preview を起動)
npm run test:ui        # Playwright UI モード
npx playwright test e2e/game.spec.ts -g "初級"   # 単一テスト実行
```

## アーキテクチャ

### 静的データ + ビルド時アセットのパターン
動画データは DB や API から動的に取るのではなく、`scripts/fetch-videos.ts` が事前に YouTube Data API v3 を叩いて以下を生成する:

- `public/data/videos.json` — 動画メタデータ一覧
- `public/thumbnails/{videoId}.jpg` — サムネイル画像

これらは両方とも `.gitignore` 対象。新規セットアップでは `.env` に `YOUTUBE_API_KEY` / `YOUTUBE_CHANNEL_IDS` (カンマ区切り) を設定してから `npm run fetch-videos` を走らせる必要がある。スクリプトは既存サムネイルをスキップし、API レート制限回避のため各リクエスト間で sleep する。

### サブパスデプロイの制約
`vite.config.ts` で `base: '/nijisanji-thumbnail-quiz/'` を指定しているため、静的アセットへの参照は必ず `import.meta.env.BASE_URL` 経由にする必要がある (例: [src/App.tsx:31](src/App.tsx#L31), [src/components/SortableContainer.tsx:99](src/components/SortableContainer.tsx#L99))。ハードコードしたルート相対パスは dev では動いても GitHub Pages で 404 になる。Playwright も `page.goto('/nijisanji-thumbnail-quiz/')` でこのパスを踏むので、base を変えるときはテストも合わせて更新する。

### ゲーム状態と純粋関数の分離
- [src/App.tsx](src/App.tsx) が `useState` で全ゲーム状態 (全動画 / 出題中 / 正解順 / 難易度 / ゲーム開始 / 結果表示) を保持し、画面遷移は条件分岐で表現 (React Router なし)。
- [src/utils/gameLogic.ts](src/utils/gameLogic.ts) は純粋関数のみ (`getRandomVideos` / `checkOrder` / `checkEachPosition` / `calculateAccuracy` / `sortByPublishedDate`)。ゲームルールを変えるときはここを触る。
- 難易度は `Difficulty = 5 | 10` のリテラル union 型で、件数そのものが値になっている。

### ドラッグ&ドロップ
[src/components/SortableContainer.tsx](src/components/SortableContainer.tsx) が @dnd-kit の `DndContext` + `SortableContext` を包むシン層。`PointerSensor` に `distance: 8` の activation constraint を付けているため、短いタップはドラッグ扱いにならない (モバイルのスクロールと共存するため)。順序変更は `arrayMove` で行い、親 (`App`) が state を持つ受動的コンポーネント。

### Playwright のテスト構成
`playwright.config.ts` の `webServer` が `npm run preview` を自動起動するため、`npm test` だけで E2E が回る。`baseURL` は `http://localhost:4173` だが、サブパスがあるのでテストは `page.goto('/nijisanji-thumbnail-quiz/')` と絶対パスを書く。UI セレクタ (`button:has-text("...")` など) に依存しているので、ボタン文言を変えると壊れる点に注意。

## プロジェクト規約

- **言語**: コード内コメント・ドキュメント・ユーザーとの会話はすべて日本語 ([.github/copilot-instructions.md](.github/copilot-instructions.md))。
- **コミットメッセージ**: Conventional Commits に日本語で準拠。header 末尾に句点を付けない。詳細は [.github/commit-instructions.md](.github/commit-instructions.md)。
- **単一責任の原則**に従う (copilot-instructions より)。
