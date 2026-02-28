# YouTube公開時期ソートゲーム

にじさんじライバーのYouTube動画サムネイルを公開日順に並び替えるゲームです。

##  ゲームの遊び方

1. 難易度を選択（初級:5件 / 上級:10件）してゲーム開始
2. 表示された動画サムネイルをドラッグ&ドロップで並び替え
3. 公開日が古い順に並び替えて「回答をチェック」をクリック
4. 結果が表示されます（正解率、各動画の正誤、公開日）

##  サポートブラウザ

- Chrome, Edge, Firefox, Safari（最新版）
- スマートフォン・タブレット対応

##  技術スタック

- **フレームワーク**: Vite + React + TypeScript
- **ドラッグ&ドロップ**: @dnd-kit
- **デプロイ**: GitHub Pages
- **テスト**: Playwright

##  開発者向け

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### YouTube動画データの取得

```bash
# YouTube Data API キーを .env に設定
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_CHANNEL_IDS=channel_id_1,channel_id_2

# 動画情報とサムネイルを取得
npm run fetch-videos
```

### テスト

```bash
# E2Eテストの実行
npm test

# テストをUIモードで実行
npm run test:ui

# テストレポートの表示
npm run test:report
```

##  プロジェクト構成

```
nijisanji-thumbnail-quiz/
├── src/
│   ├── components/          # Reactコンポーネント
│   │   ├── VideoCard.tsx   # 動画カード（ドラッグ可能）
│   │   ├── SortableContainer.tsx  # ドラッグ&ドロップコンテナ
│   │   └── ResultModal.tsx # 結果表示モーダル
│   ├── utils/              # ユーティリティ関数
│   │   ├── gameLogic.ts    # ゲームロジック
│   │   └── sound.ts        # 効果音
│   ├── types/              # TypeScript型定義
│   └── App.tsx             # メインアプリケーション
├── public/
│   ├── data/
│   │   └── videos.json     # 動画メタデータ
│   └── thumbnails/         # サムネイル画像
├── e2e/                    # E2Eテスト
│   └── game.spec.ts
├── scripts/
│   └── fetch-videos.ts     # 動画データ取得スクリプト
└── .github/
    └── workflows/
        └── deploy.yml      # 自動デプロイ設定
```

##  ライセンス

MIT

