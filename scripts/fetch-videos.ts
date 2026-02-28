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

/**
 * YouTube Data APIから特定チャンネルの動画一覧を取得
 */
async function fetchVideosFromChannel(channelId: string): Promise<VideoData[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY が設定されていません');
  }

  const videos: VideoData[] = [];
  let pageToken: string | undefined = undefined;

  console.log(`チャンネル ${channelId} から動画情報を取得中...`);

  // 全ページ取得（nextPageTokenがなくなるまで）
  while (true) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('key', YOUTUBE_API_KEY);
    url.searchParams.append('channelId', channelId);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('order', 'date');
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', MAX_RESULTS.toString());
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    for (const item of data.items) {
      videos.push({
        id: item.id.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.high.url, // 高解像度サムネイル
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
      });
    }

    console.log(`${videos.length} 件取得済み`);

    pageToken = data.nextPageToken;
    if (!pageToken) {
      break;
    }

    // API制限を避けるため待機
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

    // 動画情報取得（複数チャンネル）
    const allVideos: VideoData[] = [];
    for (let i = 0; i < channelIds.length; i++) {
      const channelId = channelIds[i];
      const videos = await fetchVideosFromChannel(channelId);
      allVideos.push(...videos);
      console.log(`  → ${videos.length} 件取得\n`);
      
      // 次のチャンネル取得前に待機
      if (i < channelIds.length - 1) {
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
