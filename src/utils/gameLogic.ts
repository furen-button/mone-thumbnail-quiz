import type { VideoData } from '../types/video';

/**
 * 難易度（動画の件数）
 */
export type Difficulty = 5 | 10;

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
      return false; // 順序が正しくない
    }
  }
  return true;
}

/**
 * 各動画の位置が正しいか判定
 * @returns 各動画が正しい位置にあるかどうかの配列
 */
export function checkEachPosition(userVideos: VideoData[], correctVideos: VideoData[]): boolean[] {
  return userVideos.map((video, index) => {
    return video.id === correctVideos[index].id;
  });
}

/**
 * 正解率を計算
 */
export function calculateAccuracy(userVideos: VideoData[], correctVideos: VideoData[]): number {
  const results = checkEachPosition(userVideos, correctVideos);
  const correctCount = results.filter(result => result).length;
  return Math.round((correctCount / correctVideos.length) * 100);
}

/**
 * 動画を公開日順にソート（正解の順序）
 */
export function sortByPublishedDate(videos: VideoData[]): VideoData[] {
  return [...videos].sort((a, b) => {
    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
}
