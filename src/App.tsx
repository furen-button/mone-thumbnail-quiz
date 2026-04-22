import { useEffect, useMemo, useState } from 'react';
import { SortableContainer } from './components/SortableContainer';
import { ResultModal } from './components/ResultModal';
import type { VideoData } from './types/video';
import {
  getRandomVideos,
  checkOrder,
  calculateAccuracy,
  sortByPublishedDate,
  formatDuration,
  getBestRecord,
  updateBestRecord,
  getSavedMoveMode,
  saveMoveMode,
  type Difficulty,
  type BestRecord,
  type MoveMode,
} from './utils/gameLogic';
import { playSuccess, playFailure } from './utils/sound';
import './App.css';

type Screen = 'menu' | 'playing' | 'result';

interface ResultSnapshot {
  userVideos: VideoData[];
  correctVideos: VideoData[];
  isCorrect: boolean;
  accuracy: number;
  durationMs: number;
  isNewBest: boolean;
}

const DIFFICULTIES: { value: Difficulty; label: string; caption: string }[] = [
  { value: 5, label: '初級', caption: '5件' },
  { value: 7, label: '上級', caption: '7件' },
];

function App() {
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>(5);
  const [currentVideos, setCurrentVideos] = useState<VideoData[]>([]);
  const [correctVideos, setCorrectVideos] = useState<VideoData[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<ResultSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestRecords, setBestRecords] = useState<Record<string, BestRecord | null>>(
    () =>
      Object.fromEntries(DIFFICULTIES.map((d) => [d.value, getBestRecord(d.value)])) as Record<
        string,
        BestRecord | null
      >
  );
  const [moveMode, setMoveMode] = useState<MoveMode>(() => getSavedMoveMode());

  const changeMoveMode = (mode: MoveMode) => {
    setMoveMode(mode);
    saveMoveMode(mode);
  };

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/videos.json`);
        if (!response.ok) throw new Error('動画データの読み込みに失敗しました');
        const videos: VideoData[] = await response.json();
        setAllVideos(videos);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (screen !== 'playing' || startedAt === null) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(id);
  }, [screen, startedAt]);

  const startGame = (chosen: Difficulty = difficulty) => {
    const randomVideos = getRandomVideos(allVideos, chosen);
    setDifficulty(chosen);
    setCorrectVideos(sortByPublishedDate(randomVideos));
    setCurrentVideos(randomVideos);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setResult(null);
    setScreen('playing');
  };

  const handleReorder = (videos: VideoData[]) => setCurrentVideos(videos);

  const handleCheck = () => {
    const finishedAt = Date.now();
    const durationMs = startedAt ? finishedAt - startedAt : 0;
    const isCorrect = checkOrder(currentVideos);
    const accuracy = calculateAccuracy(currentVideos, correctVideos);
    const isNewBest = updateBestRecord(difficulty, { accuracy, durationMs });
    setBestRecords((prev) => ({ ...prev, [String(difficulty)]: getBestRecord(difficulty) }));
    setResult({
      userVideos: currentVideos,
      correctVideos,
      isCorrect,
      accuracy,
      durationMs,
      isNewBest,
    });
    setElapsedMs(durationMs);
    setStartedAt(null);
    setScreen('result');
    window.setTimeout(() => (isCorrect ? playSuccess() : playFailure()), 250);
  };

  const backToMenu = () => {
    setResult(null);
    setScreen('menu');
  };

  const correctCount = useMemo(
    () => currentVideos.filter((v, i) => correctVideos[i]?.id === v.id).length,
    [currentVideos, correctVideos]
  );

  if (loading) {
    return (
      <div className="app app-center">
        <div className="spinner" aria-label="読み込み中" />
        <p className="status-text">動画データを読み込んでいます…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app-center">
        <div className="error-card">
          <h2>読み込みに失敗しました</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (screen === 'menu') {
    return (
      <div className="app">
        <header className="hero">
          <span className="hero-eyebrow">にじさんじ公式非公認</span>
          <h1 className="hero-title">
            サムネ<strong>公開順</strong>クイズ
          </h1>
          <p className="hero-lead">
            ライバーの動画サムネイルを、<strong>公開日が古い順</strong>に並び替えよう。
          </p>
        </header>

        <section className="menu">
          <h2 className="section-title">難易度を選ぼう</h2>
          <div className="difficulty-grid">
            {DIFFICULTIES.map((d) => {
              const best = bestRecords[String(d.value)];
              return (
                <button
                  key={d.value}
                  type="button"
                  className={`difficulty-card ${difficulty === d.value ? 'active' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  <span className="difficulty-label">{d.label}</span>
                  <span className="difficulty-caption">{d.caption}</span>
                  <span className="difficulty-best">
                    {best
                      ? `ベスト ${best.accuracy}% / ${formatDuration(best.durationMs)}`
                      : 'ベスト未記録'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mode-picker" role="radiogroup" aria-label="並び替えの操作モード">
            <span className="mode-picker-label">操作モード</span>
            <div className="mode-toggle">
              <button
                type="button"
                role="radio"
                aria-checked={moveMode === 'insert'}
                className={`mode-toggle-option ${moveMode === 'insert' ? 'active' : ''}`}
                onClick={() => changeMoveMode('insert')}
              >
                挿入
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={moveMode === 'swap'}
                className={`mode-toggle-option ${moveMode === 'swap' ? 'active' : ''}`}
                onClick={() => changeMoveMode('swap')}
              >
                入れ替え
              </button>
            </div>
            <p className="mode-picker-help">
              {moveMode === 'insert'
                ? '挿入：ドラッグ先に差し込み、間のカードがずれます'
                : '入れ替え：ドラッグ元とドロップ先を入れ替えます'}
            </p>
          </div>
          <button type="button" className="primary-button" onClick={() => startGame(difficulty)}>
            ゲーム開始
          </button>
          <p className="menu-hint">
            ドラッグ＆ドロップ、または各カードの <span aria-hidden>▲▼</span> ボタンで並び替え
          </p>
        </section>
      </div>
    );
  }

  if (screen === 'playing') {
    const total = currentVideos.length;
    const progress = total > 0 ? (correctCount / total) * 100 : 0;
    return (
      <div className="app">
        <header className="play-header">
          <div className="play-header-row">
            <div className="play-chip">
              <span className="chip-label">難易度</span>
              <span className="chip-value">
                {difficulty === 5 ? '初級 (5件)' : '上級 (7件)'}
              </span>
            </div>
            <div
              className="mode-toggle"
              role="radiogroup"
              aria-label="並び替えの操作モード"
            >
              <button
                type="button"
                role="radio"
                aria-checked={moveMode === 'insert'}
                className={`mode-toggle-option ${moveMode === 'insert' ? 'active' : ''}`}
                onClick={() => changeMoveMode('insert')}
                title="ドラッグ先に挿入し、間のカードがずれる"
              >
                挿入
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={moveMode === 'swap'}
                className={`mode-toggle-option ${moveMode === 'swap' ? 'active' : ''}`}
                onClick={() => changeMoveMode('swap')}
                title="ドラッグ元とドロップ先を入れ替える"
              >
                入れ替え
              </button>
            </div>
            <div className="play-chip timer" aria-live="polite">
              <span className="chip-label">タイム</span>
              <span className="chip-value">{formatDuration(elapsedMs)}</span>
            </div>
          </div>
          <div
            className="play-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={correctCount}
            aria-label="暫定で正しい位置のカード数"
          >
            <div className="play-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <SortableContainer
          videos={currentVideos}
          mode={moveMode}
          onReorder={handleReorder}
        />

        <div className="play-footer">
          <button type="button" className="ghost-button" onClick={backToMenu}>
            メニューへ
          </button>
          <button type="button" className="primary-button" onClick={handleCheck}>
            回答をチェック
          </button>
        </div>
      </div>
    );
  }

  // result
  if (!result) return null;
  return (
    <>
      <div className="app app-muted">
        <header className="play-header">
          <div className="play-header-row">
            <div className="play-chip">
              <span className="chip-label">難易度</span>
              <span className="chip-value">
                {difficulty === 5 ? '初級 (5件)' : '上級 (7件)'}
              </span>
            </div>
            <div className="play-chip">
              <span className="chip-label">タイム</span>
              <span className="chip-value">{formatDuration(result.durationMs)}</span>
            </div>
          </div>
        </header>
        <SortableContainer
          videos={result.userVideos}
          mode={moveMode}
          onReorder={() => {}}
        />
      </div>
      <ResultModal
        userVideos={result.userVideos}
        correctVideos={result.correctVideos}
        isCorrect={result.isCorrect}
        accuracy={result.accuracy}
        durationMs={result.durationMs}
        isNewBest={result.isNewBest}
        onRetry={backToMenu}
        onPlayAgain={() => startGame(difficulty)}
      />
    </>
  );
}

export default App;
