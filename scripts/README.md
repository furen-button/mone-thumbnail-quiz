# YouTube動画取得スクリプト

YouTube Data API v3を使用して、動画情報とサムネイル画像を取得するスクリプトです。

## セットアップ

1. `.env.example` を `.env` にコピー

```bash
cp .env.example .env
```

2. `.env` ファイルに YouTube API キーとチャンネルID（複数可）を設定

```env
YOUTUBE_API_KEY=your_actual_api_key
YOUTUBE_CHANNEL_IDS=channel_id_1,channel_id_2,channel_id_3
```

**注意**: チャンネルIDは**カンマ区切り**で複数指定できます。スペースは自動的に除去されます。

### YouTube API キーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」から「YouTube Data API v3」を有効化
4. 「認証情報」からAPIキーを作成

### チャンネルIDの確認方法

YouTubeチャンネルのURLから確認できます：
- `https://www.youtube.com/channel/CHANNEL_ID` の `CHANNEL_ID` 部分
- または、チャンネルページのソースコードから `channelId` を検索

## 実行

```bash
npm run fetch-videos
```

このスクリプトは以下を実行します：
1. YouTube Data API から各チャンネルの全動画情報を取得（nextPageTokenがなくなるまで）
2. 全チャンネルの動画を公開日順にソート
3. サムネイル画像を `public/thumbnails/` にダウンロード
4. 動画メタデータ（ID, タイトル, 公開日, URL, チャンネル情報）を `public/data/videos.json` に保存

## 出力ファイル

- `public/data/videos.json`: 動画情報（ID, タイトル, 公開日, URL, チャンネルID, チャンネル名）
- `public/thumbnails/*.jpg`: サムネイル画像ファイル

これらのファイルは `.gitignore` で除外されているため、Git管理されません。
