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
 * ベスト記録 (難易度ごとに1件のみ保持)
 */
export interface BestRecord {
  accuracy: number;
  durationMs: number;
  achievedAt: string;
}

const STORAGE_KEY = 'nijisanji-thumbnail-quiz:best-records:v1';
const MODE_KEY = 'nijisanji-thumbnail-quiz:move-mode:v1';

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

function readAll(): Record<string, BestRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BestRecord>;
  } catch {
    return {};
  }
}

export function getBestRecord(difficulty: Difficulty): BestRecord | null {
  return readAll()[String(difficulty)] ?? null;
}

/**
 * ベストを更新した場合のみ true を返す。
 * 正解率が高い方 > 同率なら時間が短い方を優先。
 */
export function updateBestRecord(
  difficulty: Difficulty,
  candidate: Omit<BestRecord, 'achievedAt'>
): boolean {
  const all = readAll();
  const key = String(difficulty);
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
