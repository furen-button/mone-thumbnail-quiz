import type { VideoData } from '../types/video';

export type Difficulty = 5 | 7;

/**
 * 並び替えの操作モード
 * - insert: ドラッグ先に挿入し、間のカードがずれる (標準のソート UI)
 * - swap:   ドラッグ元とドラッグ先を単純に位置交換する
 */
export type MoveMode = 'insert' | 'swap';

/**
 * 配列からランダムにN件抽出
 */
export function getRandomVideos(videos: VideoData[], count: number): VideoData[] {
  const shuffled = [...videos].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 動画が正しい順序（公開日の古い順）に並んでいるか確認
 */
export function checkOrder(videos: VideoData[]): boolean {
  for (let i = 0; i < videos.length - 1; i++) {
    const current = new Date(videos[i].publishedAt).getTime();
    const next = new Date(videos[i + 1].publishedAt).getTime();

    if (current > next) {
      return false;
    }
  }
  return true;
}

/**
 * 各動画の位置が正しいか判定
 */
export function checkEachPosition(userVideos: VideoData[], correctVideos: VideoData[]): boolean[] {
  return userVideos.map((video, index) => video.id === correctVideos[index].id);
}

/**
 * 正解率（%）を計算
 */
export function calculateAccuracy(userVideos: VideoData[], correctVideos: VideoData[]): number {
  const results = checkEachPosition(userVideos, correctVideos);
  const correctCount = results.filter(Boolean).length;
  return Math.round((correctCount / correctVideos.length) * 100);
}

/**
 * 動画を公開日順にソート（正解の順序）
 */
export function sortByPublishedDate(videos: VideoData[]): VideoData[] {
  return [...videos].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
}

/**
 * ミリ秒を m:ss 形式にフォーマット
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 全チャンネルを表す疑似キー
 */
export const ALL_CHANNELS = 'all';

export interface ChannelInfo {
  id: string;
  title: string;
  count: number;
}

/**
 * 動画一覧からチャンネル情報をユニークに抽出 (タイトル昇順)
 */
export function getChannels(videos: VideoData[]): ChannelInfo[] {
  const map = new Map<string, ChannelInfo>();
  for (const v of videos) {
    const existing = map.get(v.channelId);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(v.channelId, { id: v.channelId, title: v.channelTitle, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'ja'));
}

/**
 * 選択中チャンネルに該当する動画だけを返す。'all' の場合は全件。
 */
export function filterByChannel(videos: VideoData[], channelKey: string): VideoData[] {
  if (channelKey === ALL_CHANNELS) return videos;
  return videos.filter((v) => v.channelId === channelKey);
}

/**
 * ベスト記録 (チャンネル × 難易度ごとに1件のみ保持)
 */
export interface BestRecord {
  accuracy: number;
  durationMs: number;
  achievedAt: string;
}

const STORAGE_KEY = 'nijisanji-thumbnail-quiz:best-records:v1';
const MODE_KEY = 'nijisanji-thumbnail-quiz:move-mode:v1';
const CHANNEL_KEY = 'nijisanji-thumbnail-quiz:channel:v1';
const TUTORIAL_KEY = 'nijisanji-thumbnail-quiz:tutorial-seen:v1';

export function getSavedMoveMode(): MoveMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return raw === 'insert' ? 'insert' : 'swap';
  } catch {
    return 'swap';
  }
}

export function saveMoveMode(mode: MoveMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // 無視
  }
}

export function getSavedChannel(): string {
  try {
    return localStorage.getItem(CHANNEL_KEY) ?? ALL_CHANNELS;
  } catch {
    return ALL_CHANNELS;
  }
}

export function saveChannel(channelKey: string): void {
  try {
    localStorage.setItem(CHANNEL_KEY, channelKey);
  } catch {
    // 無視
  }
}

export function getTutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // 無視
  }
}

function readAll(): Record<string, BestRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BestRecord>;
  } catch {
    return {};
  }
}

function recordKey(channelKey: string, difficulty: Difficulty): string {
  return `${channelKey}:${difficulty}`;
}

export function getBestRecord(
  difficulty: Difficulty,
  channelKey: string = ALL_CHANNELS
): BestRecord | null {
  const all = readAll();
  return all[recordKey(channelKey, difficulty)] ?? null;
}

/**
 * ベストを更新した場合のみ true を返す。
 * 正解率が高い方 > 同率なら時間が短い方を優先。
 */
export function updateBestRecord(
  difficulty: Difficulty,
  channelKey: string,
  candidate: Omit<BestRecord, 'achievedAt'>
): boolean {
  const all = readAll();
  const key = recordKey(channelKey, difficulty);
  const prev = all[key];
  const isBetter =
    !prev ||
    candidate.accuracy > prev.accuracy ||
    (candidate.accuracy === prev.accuracy && candidate.durationMs < prev.durationMs);
  if (!isBetter) return false;
  all[key] = { ...candidate, achievedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // quota/privacy mode 等は無視
  }
  return true;
}
