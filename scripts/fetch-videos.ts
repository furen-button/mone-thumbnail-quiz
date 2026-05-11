/**
 * YouTube Data API v3を使用して動画情報とサムネイルをダウンロードするスクリプト
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_IDS = process.env.YOUTUBE_CHANNEL_IDS || '';
const MAX_RESULTS = 50; // 1回のAPIリクエストで取得する動画数
const API_WAIT_MS = 5000; // APIリクエスト間の待ち時間（ミリ秒）
const DOWNLOAD_WAIT_MS = 1000; // ダウンロード間の待ち時間（ミリ秒）

/**
 * 指定ミリ秒待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
  channelId: string;
  channelTitle: string;
}

interface ChannelMeta {
  id: string;
  title: string;
  iconPath: string; // public/ 相対パス (例: "channels/UCxxxx.jpg")
  uploadsPlaylistId: string; // アップロード動画プレイリスト ID
}

/**
 * YouTube channels API で各チャンネルのタイトル・アイコン URL・アップロードプレイリスト ID を取得し、
 * アイコンを public/channels にダウンロードする。
 */
async function fetchChannelMetas(
  channelIds: string[],
  channelsDir: string
): Promise<ChannelMeta[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY が設定されていません');
  }
  if (!fs.existsSync(channelsDir)) {
    fs.mkdirSync(channelsDir, { recursive: true });
  }

  console.log('\nチャンネル情報を取得中...');
  // channels.list は id を最大 50 件カンマ区切りで一度に取得できる
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.append('key', YOUTUBE_API_KEY);
  url.searchParams.append('id', channelIds.join(','));
  url.searchParams.append('part', 'snippet,contentDetails');
  url.searchParams.append('maxResults', String(channelIds.length));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube channels API エラー: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const metas: ChannelMeta[] = [];

  for (const item of data.items) {
    const id: string = item.id;
    const title: string = item.snippet.title;
    const thumbs = item.snippet.thumbnails ?? {};
    const iconUrl: string =
      thumbs.medium?.url ?? thumbs.high?.url ?? thumbs.default?.url ?? '';
    const uploadsPlaylistId: string = item.contentDetails.relatedPlaylists.uploads;
    const iconFile = `${id}.jpg`;
    const iconLocalPath = path.join(channelsDir, iconFile);

    if (iconUrl && !fs.existsSync(iconLocalPath)) {
      try {
        await downloadThumbnail(iconUrl, iconLocalPath);
        console.log(`  ${title}: アイコン取得`);
        await sleep(DOWNLOAD_WAIT_MS);
      } catch (err) {
        console.error(`  ${title}: アイコン取得失敗`, err);
      }
    } else if (iconUrl) {
      console.log(`  ${title}: アイコン取得済み (スキップ)`);
    } else {
      console.warn(`  ${title}: アイコン URL が取得できませんでした`);
    }

    metas.push({ id, title, iconPath: `channels/${iconFile}`, uploadsPlaylistId });
  }

  // 設定されていたが API が返さなかったチャンネル ID を検出
  const returned = new Set(metas.map((m) => m.id));
  for (const id of channelIds) {
    if (!returned.has(id)) {
      console.warn(`  ⚠️  チャンネル ${id} の情報が取得できませんでした`);
    }
  }

  return metas;
}

/**
 * アップロード動画プレイリスト経由でチャンネルの全動画を取得する。
 * search.list（最大約500件・100ユニット/回）の代わりに
 * playlistItems.list（無制限・1ユニット/回）を使うことで全件取得が可能。
 */
async function fetchVideosFromChannel(uploadsPlaylistId: string): Promise<VideoData[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY が設定されていません');
  }

  const videos: VideoData[] = [];
  let pageToken: string | undefined = undefined;

  console.log(`プレイリスト ${uploadsPlaylistId} から動画情報を取得中...`);

  while (true) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.append('key', YOUTUBE_API_KEY);
    url.searchParams.append('playlistId', uploadsPlaylistId);
    url.searchParams.append('part', 'snippet,status');
    url.searchParams.append('maxResults', MAX_RESULTS.toString());
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`YouTube API エラー: ${response.status} ${errData?.error?.message ?? response.statusText}`);
    }

    const data = await response.json();

    for (const item of data.items) {
      // 非公開・削除済み動画を除外
      const privacy = item.status?.privacyStatus;
      if (privacy === 'private' || privacy === 'privacyStatusUnspecified') {
        continue;
      }

      const videoId: string = item.snippet.resourceId.videoId;
      const thumbs = item.snippet.thumbnails ?? {};
      const thumbnailUrl: string =
        thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? '';

      videos.push({
        id: videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
      });
    }

    console.log(`${videos.length} 件取得済み`);

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    await sleep(API_WAIT_MS);
  }

  return videos;
}

/**
 * サムネイル画像をダウンロード
 */
function downloadThumbnail(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // エラー時はファイル削除
      reject(err);
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 出力ディレクトリ作成
    const publicDir = path.join(__dirname, '../public');
    const dataDir = path.join(publicDir, 'data');
    const thumbnailsDir = path.join(publicDir, 'thumbnails');
    const channelsDir = path.join(publicDir, 'channels');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    // チャンネルIDの確認
    if (!CHANNEL_IDS) {
      throw new Error('YOUTUBE_CHANNEL_IDS が設定されていません');
    }

    const channelIds = CHANNEL_IDS.split(',').map(id => id.trim()).filter(id => id);
    if (channelIds.length === 0) {
      throw new Error('有効なチャンネルIDが設定されていません');
    }

    console.log(`${channelIds.length} 個のチャンネルから動画を取得します\n`);

    // チャンネル情報＋アイコンを先に取得
    const channelMetas = await fetchChannelMetas(channelIds, channelsDir);
    const channelsJsonPath = path.join(dataDir, 'channels.json');
    const channelsForJson = channelMetas.map(({ id, title, iconPath }) => ({ id, title, iconPath }));
    fs.writeFileSync(channelsJsonPath, JSON.stringify(channelsForJson, null, 2), 'utf-8');
    console.log(`✅ ${channelsJsonPath} を生成しました\n`);

    // 動画情報取得（複数チャンネル）
    const allVideos: VideoData[] = [];
    for (let i = 0; i < channelMetas.length; i++) {
      const { id: channelId, uploadsPlaylistId } = channelMetas[i];
      console.log(`チャンネル ${channelId} の動画を取得中...`);
      const videos = await fetchVideosFromChannel(uploadsPlaylistId);
      allVideos.push(...videos);
      console.log(`  → ${videos.length} 件取得\n`);
      
      // 次のチャンネル取得前に待機
      if (i < channelMetas.length - 1) {
        console.log('次のチャンネル取得前に待機中...\n');
        await sleep(API_WAIT_MS * 2);
      }
    }

    console.log(`合計 ${allVideos.length} 件の動画を取得しました`);

    // 公開日でソート（古い順）
    allVideos.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

    // サムネイルダウンロード
    console.log('\nサムネイル画像をダウンロード中...');
    let downloadedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < allVideos.length; i++) {
      const video = allVideos[i];
      const thumbnailPath = path.join(thumbnailsDir, `${video.id}.jpg`);
      
      // 既にダウンロード済みならスキップ
      if (fs.existsSync(thumbnailPath)) {
        skippedCount++;
        console.log(`[${i + 1}/${allVideos.length}] ${video.id}.jpg (スキップ)`);
        continue;
      }
      
      try {
        await downloadThumbnail(video.thumbnailUrl, thumbnailPath);
        downloadedCount++;
        console.log(`[${i + 1}/${allVideos.length}] ${video.id}.jpg (ダウンロード)`);
        
        // ダウンロード間隔を空ける
        if (i < allVideos.length - 1) {
          await sleep(DOWNLOAD_WAIT_MS);
        }
      } catch (err) {
        console.error(`エラー: ${video.id} のダウンロードに失敗`, err);
      }
    }

    console.log(`\nダウンロード: ${downloadedCount} 件, スキップ: ${skippedCount} 件`);

    // videos.json 生成
    const jsonPath = path.join(dataDir, 'videos.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allVideos, null, 2), 'utf-8');
    console.log(`\n✅ ${jsonPath} を生成しました`);

    console.log('\n完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
