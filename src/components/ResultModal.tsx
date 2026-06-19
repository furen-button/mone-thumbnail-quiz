import { useEffect, useRef } from 'react';
import type { VideoData } from '../types/video';
import { formatDuration } from '../utils/gameLogic';
import { burstConfetti } from '../utils/confetti';
import './ResultModal.css';

interface ResultModalProps {
  userVideos: VideoData[];
  correctVideos: VideoData[];
  isCorrect: boolean;
  accuracy: number;
  durationMs: number;
  isNewBest: boolean;
  onRetry: () => void;
  onPlayAgain: () => void;
}

export function ResultModal({
  userVideos,
  correctVideos,
  isCorrect,
  accuracy,
  durationMs,
  isNewBest,
  onRetry,
  onPlayAgain,
}: ResultModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isCorrect) burstConfetti();
  }, [isCorrect]);

  // 初期フォーカス移動
  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  // Escape キーで閉じる（メニューへ戻る）& フォーカストラップ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRetry();
        return;
      }
      if (e.key === 'Tab') {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const focusable = overlay.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onRetry]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
  };

  const checkPosition = (i: number) => userVideos[i]?.id === correctVideos[i]?.id;

  const headline = isCorrect ? '🎉 パーフェクト！' : accuracy >= 60 ? '👏 おしい！' : '🫠 むずかしい…';
  const subheadline = isCorrect
    ? '全ての動画を公開順に並べられました。'
    : '正しい順序を見比べてみよう。';

  return (
    <div
      ref={overlayRef}
      className="result-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-headline"
    >
      <div className={`result-modal ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
        <div className="result-header">
          <h2 id="result-headline" className="result-headline">{headline}</h2>
          <p className="result-sub">{subheadline}</p>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">正解率</span>
              <span className="stat-value accent">{accuracy}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">タイム</span>
              <span className="stat-value">{formatDuration(durationMs)}</span>
            </div>
          </div>
          {isNewBest && <div className="best-badge">🏅 ベスト更新！</div>}
        </div>

        <div className="result-content">
          <h3 className="result-section-title">正しい順序</h3>
          <ol className="video-result-list">
            {correctVideos.map((video, index) => {
              const ok = checkPosition(index);
              const userVideo = userVideos[index];
              return (
                <li
                  key={video.id}
                  className={`video-result-item ${ok ? 'correct' : 'incorrect'}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="video-result-top">
                    <span className="video-number">{index + 1}</span>
                    <span className={`video-status ${ok ? 'correct' : 'incorrect'}`}>
                      {ok ? '✓ 正解' : '✗ 不正解'}
                    </span>
                    <span className="video-date-chip">{formatDate(video.publishedAt)}</span>
                  </div>
                  <div className="video-result-body">
                    <a
                      className="video-thumb-link"
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}thumbnails/${video.id}.jpg`}
                        alt={video.title}
                        loading="lazy"
                      />
                    </a>
                    <div className="video-info">
                      <h4 className="video-title">{video.title}</h4>
                      <p className="video-channel">{video.channelTitle}</p>
                      {!ok && userVideo && (
                        <p className="your-answer">
                          <span className="label">あなたの答え：</span>
                          {userVideo.title}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="result-footer">
          <button ref={retryRef} type="button" className="ghost-button" onClick={onRetry}>
            もう一度挑戦
          </button>
          <button type="button" className="primary-button" onClick={onPlayAgain}>
            同じ難易度でもう一回
          </button>
        </div>
      </div>
    </div>
  );
}
