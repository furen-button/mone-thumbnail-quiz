import { useState, useEffect } from 'react';
import { SortableContainer } from './components/SortableContainer';
import type { VideoData } from './types/video';
import { 
  getRandomVideos, 
  checkOrder, 
  calculateAccuracy, 
  sortByPublishedDate,
  type Difficulty 
} from './utils/gameLogic';
import './App.css';

function App() {
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [currentVideos, setCurrentVideos] = useState<VideoData[]>([]);
  const [correctVideos, setCorrectVideos] = useState<VideoData[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>(5);
  const [gameStarted, setGameStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 動画データの読み込み
   */
  useEffect(() => {
    async function loadVideos() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/videos.json`);
        if (!response.ok) {
          throw new Error('動画データの読み込みに失敗しました');
        }
        const videos: VideoData[] = await response.json();
        setAllVideos(videos);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  /**
   * ゲーム開始
   */
  const startGame = () => {
    const randomVideos = getRandomVideos(allVideos, difficulty);
    const sorted = sortByPublishedDate(randomVideos);
    
    setCorrectVideos(sorted);
    setCurrentVideos(randomVideos);
    setGameStarted(true);
    setShowResult(false);
  };

  /**
   * 動画順序の更新
   */
  const handleReorder = (newVideos: VideoData[]) => {
    setCurrentVideos(newVideos);
  };

  /**
   * 並び順を確認
   */
  const handleCheck = () => {
    setShowResult(true);
  };

  /**
   * もう一度プレイ
   */
  const handleRetry = () => {
    startGame();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">エラー: {error}</div>
      </div>
    );
  }

  // ゲーム開始前の画面
  if (!gameStarted) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>YouTube公開時期ソートゲーム</h1>
          <p>動画を公開日が古い順に並び替えてください</p>
        </header>
        <div className="difficulty-selector">
          <h2>難易度を選択</h2>
          <div className="difficulty-buttons">
            <button
              className={`difficulty-button ${difficulty === 5 ? 'active' : ''}`}
              onClick={() => setDifficulty(5)}
            >
              初級（5件）
            </button>
            <button
              className={`difficulty-button ${difficulty === 10 ? 'active' : ''}`}
              onClick={() => setDifficulty(10)}
            >
              上級（10件）
            </button>
          </div>
          <button className="start-button" onClick={startGame}>
            ゲーム開始
          </button>
        </div>
      </div>
    );
  }

  // 結果表示
  if (showResult) {
    const isCorrect = checkOrder(currentVideos);
    const accuracy = calculateAccuracy(currentVideos, correctVideos);

    return (
      <div className="app">
        <header className="app-header">
          <h1>{isCorrect ? '🎉 完璧です！' : '😢 惜しい！'}</h1>
          <p className="result-accuracy">正解率: {accuracy}%</p>
        </header>
        <div className="result-info">
          <p>{isCorrect ? '全ての動画を正しい順序に並べました！' : '順序が間違っています。もう一度挑戦してみましょう！'}</p>
        </div>
        <SortableContainer videos={currentVideos} onReorder={handleReorder} />
        <div className="app-footer">
          <button className="retry-button" onClick={handleRetry}>
            もう一度プレイ
          </button>
        </div>
      </div>
    );
  }

  // ゲームプレイ中
  return (
    <div className="app">
      <header className="app-header">
        <h1>YouTube公開時期ソートゲーム</h1>
        <p>動画を公開日が古い順に並び替えてください</p>
        <p className="difficulty-info">難易度: {difficulty === 5 ? '初級（5件）' : '上級（10件）'}</p>
      </header>
      <SortableContainer videos={currentVideos} onReorder={handleReorder} />
      <div className="app-footer">
        <button className="check-button" onClick={handleCheck}>
          並び順を確認
        </button>
      </div>
    </div>
  );
}

export default App;
