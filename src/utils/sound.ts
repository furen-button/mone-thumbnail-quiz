/**
 * 効果音を再生するユーティリティ
 */

/**
 * ドラッグ開始時の音
 */
export function playDragStart() {
  playTone(440, 0.1, 0.05); // A4, 100ms
}

/**
 * ドロップ時の音
 */
export function playDrop() {
  playTone(523, 0.15, 0.08); // C5, 150ms
}

/**
 * 正解時の音
 */
export function playSuccess() {
  // 上昇する3音
  setTimeout(() => playTone(523, 0.15, 0.1), 0);   // C5
  setTimeout(() => playTone(659, 0.15, 0.1), 150); // E5
  setTimeout(() => playTone(784, 0.3, 0.15), 300); // G5
}

/**
 * 不正解時の音
 */
export function playFailure() {
  // 下降する2音
  setTimeout(() => playTone(440, 0.2, 0.1), 0);  // A4
  setTimeout(() => playTone(349, 0.4, 0.15), 200); // F4
}

/**
 * 基本的な音を生成して再生
 */
function playTone(frequency: number, duration: number, volume: number = 0.1) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // 音声再生に失敗しても処理を続ける
    console.warn('Sound playback failed:', error);
  }
}
