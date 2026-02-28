import { useState, useEffect } from 'react';
import { SortableContainer } from './components/SortableContainer';
import type { VideoData } from './types/video';
import './App.css';

function App() {
  const [videos, setVideos] = useState<VideoData[]>([]);
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
        const allVideos: VideoData[] = await response.json();
        
        // テスト用に最初の5件を取得
        const testVideos = allVideos.slice(0, 5);
        setVideos(testVideos);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  /**
   * 動画順序の更新
   */
  const handleReorder = (newVideos: VideoData[]) => {
    setVideos(newVideos);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>YouTube公開時期ソートゲーム</h1>
        <p>動画を公開日が古い順に並び替えてください</p>
      </header>
      <SortableContainer videos={videos} onReorder={handleReorder} />
      <div className="app-footer">
        <button className="check-button">並び順を確認</button>
      </div>
    </div>
  );
}

export default App;
