/**
 * 動画データの型定義
 */
export interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
  channelId: string;
  channelTitle: string;
}

/**
 * チャンネルメタ情報。fetch-videos スクリプトが channels.json として出力する。
 * iconPath は public/ 配下の相対パス (例: "channels/UCxxxxxx.jpg")。
 */
export interface ChannelMeta {
  id: string;
  title: string;
  iconPath: string;
}
