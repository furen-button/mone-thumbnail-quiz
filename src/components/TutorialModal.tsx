import './TutorialModal.css';

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="tutorial-modal-overlay" role="dialog" aria-modal="true" aria-label="チュートリアル">
      <div className="tutorial-modal">
        <header className="tutorial-header">
          <h2 className="tutorial-title">遊び方ガイド</h2>
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
              <li>ドラッグ&ドロップで並び替えできます。</li>
              <li>カード右側の ▲▼ ボタンでも並び替えできます。</li>
              <li>挿入/入れ替えモードはヘッダーからいつでも切り替えできます。</li>
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
          <button type="button" className="primary-button" onClick={onClose}>
            チュートリアルを閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
