import { useEffect, useRef } from 'react';
import './TutorialModal.css';

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 初期フォーカス移動
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape キーで閉じる & フォーカストラップ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="tutorial-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="tutorial-modal">
        <header className="tutorial-header">
          <h2 id="tutorial-title" className="tutorial-title">遊び方ガイド</h2>
          <p className="tutorial-subtitle">初回はここから、いつでもヘルプで見返せます。</p>
        </header>

        <div className="tutorial-content">
          <section className="tutorial-section">
            <h3>目的</h3>
            <p>動画サムネイルを公開日の古い順に並べるとクリアです。</p>
          </section>

          <section className="tutorial-section">
            <h3>操作方法</h3>
            <ul>
              <li>ドラッグ&ドロップで並び替えできます。ドラッグ元とドロップ先が入れ替わります。</li>
              <li>カード右側の ▲▼ ボタンでも並び替えできます。</li>
            </ul>
            <p className="tutorial-note">
              端末によってはドラッグ操作が正常に動かない場合があります。その場合は ▲▼ ボタン操作を利用してください。
            </p>
          </section>

          <section className="tutorial-section">
            <h3>ヒントとタイマー</h3>
            <ul>
              <li>プレイ時間が進むと段階的にヒントが解放されます。</li>
              <li>ヘルプ表示中はタイマーが停止し、閉じると再開します。</li>
            </ul>
          </section>
        </div>

        <footer className="tutorial-footer">
          <button ref={closeRef} type="button" className="primary-button" onClick={onClose}>
            チュートリアルを閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
