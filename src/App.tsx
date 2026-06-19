import { useEffect, useMemo, useState } from 'react';
import { SortableContainer } from './components/SortableContainer';
import { ResultModal } from './components/ResultModal';
import { TutorialModal } from './components/TutorialModal';
import type { VideoData, ChannelMeta } from './types/video';
import {
  getRandomVideos,
  checkOrder,
  calculateAccuracy,
  sortByPublishedDate,
  formatDuration,
  getBestRecord,
  updateBestRecord,
  getSavedChannel,
  saveChannel,
  getTutorialSeen,
  saveTutorialSeen,
  getChannels,
  filterByChannel,
  ALL_CHANNELS,
  type Difficulty,
  type BestRecord,
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

const HINT_STAGES = [
  { at: 20, label: '年を表示' },
  { at: 40, label: '年月を表示' },
  { at: 60, label: '正解位置をハイライト' },
  { at: 90, label: '最古／最新を表示' },
] as const;

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
  const [selectedChannel, setSelectedChannel] = useState<string>(() => getSavedChannel());
  const [channelMetas, setChannelMetas] = useState<Record<string, ChannelMeta>>({});
  const [bestRecords, setBestRecords] = useState<Record<string, BestRecord | null>>(() =>
    Object.fromEntries(
      DIFFICULTIES.map((d) => [d.value, getBestRecord(d.value, getSavedChannel())])
    ) as Record<string, BestRecord | null>
  );
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isTutorialSeen, setIsTutorialSeen] = useState(() => getTutorialSeen());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [isAutoTutorialSession, setIsAutoTutorialSession] = useState(false);

  const channels = useMemo(() => getChannels(allVideos), [allVideos]);
  const availableVideos = useMemo(
    () => filterByChannel(allVideos, selectedChannel),
    [allVideos, selectedChannel]
  );

  const changeChannel = (channelKey: string) => {
    setSelectedChannel(channelKey);
    saveChannel(channelKey);
    setBestRecords(
      Object.fromEntries(
        DIFFICULTIES.map((d) => [d.value, getBestRecord(d.value, channelKey)])
      ) as Record<string, BestRecord | null>
    );
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
    async function loadChannels() {
      // channels.json は無くても動作する (fetch-videos 未実行時のフォールバック)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/channels.json`);
        if (!res.ok) return;
        const list: ChannelMeta[] = await res.json();
        setChannelMetas(Object.fromEntries(list.map((c) => [c.id, c])));
      } catch {
        // 無視
      }
    }
    load();
    loadChannels();
  }, []);

  useEffect(() => {
    if (screen !== 'playing' || startedAt === null || isTutorialOpen) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(id);
  }, [screen, startedAt, isTutorialOpen]);

  const openTutorial = () => {
    setIsAutoTutorialSession(false);
    if (screen === 'playing' && startedAt !== null && pausedAt === null) {
      const now = Date.now();
      setPausedAt(now);
      setElapsedMs(now - startedAt);
    }
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    if (pausedAt !== null) {
      const pausedDuration = Date.now() - pausedAt;
      setStartedAt((prev) => (prev === null ? null : prev + pausedDuration));
      setPausedAt(null);
    }
    if (isAutoTutorialSession && !isTutorialSeen) {
      saveTutorialSeen();
      setIsTutorialSeen(true);
    }
    setIsAutoTutorialSession(false);
    setIsTutorialOpen(false);
  };

  const startGame = (chosen: Difficulty = difficulty) => {
    if (availableVideos.length < chosen) return;
    const randomVideos = getRandomVideos(availableVideos, chosen);
    setDifficulty(chosen);
    setCorrectVideos(sortByPublishedDate(randomVideos));
    setCurrentVideos(randomVideos);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setResult(null);
    setScreen('playing');
    if (!isTutorialSeen) {
      setPausedAt(Date.now());
      setIsAutoTutorialSession(true);
      setIsTutorialOpen(true);
    }
  };

  const handleReorder = (videos: VideoData[]) => setCurrentVideos(videos);

  const handleCheck = () => {
    const finishedAt = Date.now();
    const durationMs = startedAt ? finishedAt - startedAt : 0;
    const isCorrect = checkOrder(currentVideos);
    const accuracy = calculateAccuracy(currentVideos, correctVideos);
    // ベスト記録はパーフェクト（全問正解）時のみ更新
    const isNewBest = isCorrect
      ? updateBestRecord(difficulty, selectedChannel, { accuracy, durationMs })
      : false;
    setBestRecords((prev) => ({
      ...prev,
      [String(difficulty)]: getBestRecord(difficulty, selectedChannel),
    }));
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
    setPausedAt(null);
    setIsAutoTutorialSession(false);
    setIsTutorialOpen(false);
    setScreen('menu');
  };

  const positionCorrects = useMemo(
    () => currentVideos.map((v, i) => correctVideos[i]?.id === v.id),
    [currentVideos, correctVideos]
  );

  const correctCount = useMemo(
    () => positionCorrects.filter(Boolean).length,
    [positionCorrects]
  );

  const elapsedSec = elapsedMs / 1000;
  const hintLevel = HINT_STAGES.reduce(
    (acc, s) => (elapsedSec >= s.at ? acc + 1 : acc),
    0
  );
  const nextHint = HINT_STAGES.find((s) => elapsedSec < s.at);
  const remainingSec = nextHint ? Math.max(1, Math.ceil(nextHint.at - elapsedSec)) : 0;
  const oldestId = correctVideos[0]?.id ?? null;
  const newestId = correctVideos[correctVideos.length - 1]?.id ?? null;

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
    const heroName = 'サムネイルクイズ';
    const heroIconSrc =
      selectedChannel !== ALL_CHANNELS && channelMetas[selectedChannel]
        ? `${import.meta.env.BASE_URL}${channelMetas[selectedChannel].iconPath}`
        : null;
    return (
      <>
        <div className="app site" inert={isTutorialOpen ? true : undefined}>
        <header className="hero" id="top">
          <span className="hero-script" aria-hidden>
            Welcome
          </span>
          <span className="hero-eyebrow">非公式ファンサイト</span>
          {heroIconSrc && (
            <img className="hero-icon" src={heroIconSrc} alt="" loading="lazy" />
          )}
          <h1 className="hero-title">
            <span aria-hidden>🪷</span> {heroName}
          </h1>
          <p className="hero-lead">
            サムネ公開順クイズで、梢桃音との思い出をなぞってみませんか。
          </p>
        </header>

        <section className="wiki-section" id="quiz">
          <header className="wiki-section-head">
            <span className="script-eyebrow" aria-hidden>
              Quiz
            </span>
            <h2 className="section-heading">クイズに挑戦</h2>
          </header>
          <p className="wiki-section-lead">
            動画サムネイルを <strong>公開日が古い順</strong> に並べ替えるお遊び。
            時間が経つほど、そっとヒントが増えていきます。
          </p>

          {channels.length >= 2 && (
            <div className="channel-picker">
              <span className="channel-picker-label">チャンネル</span>
              <div
                className="channel-list"
                role="radiogroup"
                aria-label="クイズ対象のチャンネル"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedChannel === ALL_CHANNELS}
                  className={`channel-chip ${selectedChannel === ALL_CHANNELS ? 'active' : ''}`}
                  onClick={() => changeChannel(ALL_CHANNELS)}
                >
                  <span className="channel-avatar avatar-all" aria-hidden>
                    全
                  </span>
                  <span className="channel-chip-text">
                    <span className="channel-chip-name">全チャンネル</span>
                    <span className="channel-chip-count">{allVideos.length}件</span>
                  </span>
                </button>
                {channels.map((c) => {
                  const meta = channelMetas[c.id];
                  const iconSrc = meta
                    ? `${import.meta.env.BASE_URL}${meta.iconPath}`
                    : null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedChannel === c.id}
                      className={`channel-chip ${selectedChannel === c.id ? 'active' : ''}`}
                      onClick={() => changeChannel(c.id)}
                    >
                      {iconSrc ? (
                        <img
                          className="channel-avatar"
                          src={iconSrc}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="channel-avatar avatar-fallback" aria-hidden>
                          {c.title.slice(0, 1)}
                        </span>
                      )}
                      <span className="channel-chip-text">
                        <span className="channel-chip-name">{c.title}</span>
                        <span className="channel-chip-count">{c.count}件</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h3 className="subsection-heading">難易度を選ぼう</h3>
          <div className="difficulty-grid">
            {DIFFICULTIES.map((d) => {
              const best = bestRecords[String(d.value)];
              const insufficient = availableVideos.length < d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  className={`difficulty-card ${difficulty === d.value ? 'active' : ''} ${
                    insufficient ? 'disabled' : ''
                  }`}
                  onClick={() => !insufficient && setDifficulty(d.value)}
                  disabled={insufficient}
                  aria-disabled={insufficient}
                >
                  <span className="difficulty-label">{d.label}</span>
                  <span className="difficulty-caption">{d.caption}</span>
                  <span className="difficulty-best">
                    {insufficient
                      ? `動画不足 (${availableVideos.length}件)`
                      : best
                        ? `ベスト ${best.accuracy}% / ${formatDuration(best.durationMs)}`
                        : 'ベスト未記録'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => startGame(difficulty)}
            disabled={availableVideos.length < difficulty}
          >
            ゲーム開始
          </button>
          <button
            type="button"
            className="ghost-button menu-help-button"
            onClick={openTutorial}
          >
            ヘルプ
          </button>
          <p className="menu-hint">
            ドラッグ＆ドロップ、または各カードの <span aria-hidden>▲▼</span> ボタンで並び替え
          </p>
        </section>

        <footer className="site-footer">
          <p className="site-footer-script" aria-hidden>
            Thank you for visiting
          </p>
          <p className="site-footer-copy">
            公式とは関係のない非公式ファンサイトです。
          </p>
          <ul className="site-footer-links" aria-label="SNSリンク (準備中)">
            <li>
              <a href="#" aria-disabled="true" tabIndex={-1}>
                X
              </a>
            </li>
            <li>
              <a href="#" aria-disabled="true" tabIndex={-1}>
                YouTube
              </a>
            </li>
            <li>
              <a href="#" aria-disabled="true" tabIndex={-1}>
                Discord
              </a>
            </li>
          </ul>
        </footer>
        </div>
        {isTutorialOpen && <TutorialModal onClose={closeTutorial} />}
      </>
    );
  }

  if (screen === 'playing') {
    const total = currentVideos.length;
    const progress = total > 0 ? (correctCount / total) * 100 : 0;
    return (
      <>
        <div className="app" inert={isTutorialOpen ? true : undefined}>
        <header className="play-header">
          <div className="play-header-row">
            <div className="play-chip">
              <span className="chip-label">難易度</span>
              <span className="chip-value">
                {difficulty === 5 ? '初級 (5件)' : '上級 (7件)'}
              </span>
            </div>
            <button type="button" className="ghost-button play-help-button" onClick={openTutorial}>
              ヘルプ
            </button>
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
          <p className="play-hint-banner" aria-live="polite">
            {nextHint ? (
              <>
                次のヒント <strong>{remainingSec}秒後</strong> — {nextHint.label}
              </>
            ) : (
              <>すべてのヒントが解放されました</>
            )}
          </p>
        </header>

        <SortableContainer
          videos={currentVideos}
          mode="swap"
          onReorder={handleReorder}
          hintLevel={hintLevel}
          positionCorrects={hintLevel >= 3 ? positionCorrects : undefined}
          oldestId={hintLevel >= 4 ? oldestId : null}
          newestId={hintLevel >= 4 ? newestId : null}
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
        {isTutorialOpen && <TutorialModal onClose={closeTutorial} />}
      </>
    );
  }

  // result
  if (!result) return null;
  return (
    <>
      <div className="app app-muted" inert>
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
          mode="swap"
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
