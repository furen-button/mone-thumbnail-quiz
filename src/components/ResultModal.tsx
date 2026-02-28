import type { VideoData } from '../types/video';
import './ResultModal.css';

/**
 * 結果モーダルコンポーネント
 * 各動画の詳細情報（タイトル、公開日、URL）と正誤を表示
 */
interface ResultModalProps {
  userVideos: VideoData[];
  correctVideos: VideoData[];
  isCorrect: boolean;
  accuracy: number;
  onRetry: () => void;
}

export function ResultModal({ 
  userVideos, 
  correctVideos, 
  isCorrect, 
  accuracy,
  onRetry 
}: ResultModalProps) {
  
  /**
   * 日付をフォーマット（YYYY年MM月DD日 HH:mm）
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  /**
   * 各動画が正しい位置にあるかチェック
   */
  const checkPosition = (index: number): boolean => {
    return userVideos[index].id === correctVideos[index].id;
  };

  return (
    <div className="result-modal-overlay">
      <div className="result-modal">
        <div className="result-header">
          <h2 className={isCorrect ? 'success' : 'failure'}>
            {isCorrect ? '🎉 完璧です！' : '😢 惜しい！'}
          </h2>
          <p className="result-accuracy">正解率: {accuracy}%</p>
          <p className="result-message">
            {isCorrect 
              ? '全ての動画を正しい順序に並べました！' 
              : '順序が間違っています。正しい順序を確認しましょう。'}
          </p>
        </div>

        <div className="result-content">
          <h3>正しい順序</h3>
          <div className="video-list">
            {correctVideos.map((video, index) => {
              const isCorrectPosition = checkPosition(index);
              const userVideo = userVideos[index];
              
              return (
                <div 
                  key={video.id} 
                  className={`video-result-item ${isCorrectPosition ? 'correct' : 'incorrect'}`}
                >
                  <div className="video-result-header">
                    <span className="video-number">{index + 1}</span>
                    <span className={`video-status ${isCorrectPosition ? 'correct' : 'incorrect'}`}>
                      {isCorrectPosition ? '✓ 正解' : '✗ 不正解'}
                    </span>
                  </div>
                  
                  <div className="video-result-body">
                    <div className="video-thumbnail">
                      <img
                        src={`${import.meta.env.BASE_URL}thumbnails/${video.id}.jpg`}
                        alt={video.title}
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="video-info">
                      <h4 className="video-title">{video.title}</h4>
                      <p className="video-date">
                        <span className="label">公開日:</span>
                        {formatDate(video.publishedAt)}
                      </p>
                      <p className="video-channel">
                        <span className="label">チャンネル:</span>
                        {video.channelTitle}
                      </p>
                      <a 
                        href={video.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="video-link"
                      >
                        動画を見る →
                      </a>
                      
                      {!isCorrectPosition && (
                        <div className="incorrect-info">
                          <p className="your-answer">
                            あなたの答え: {userVideo.title}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="result-footer">
          <button className="retry-button" onClick={onRetry}>
            もう一度プレイ
          </button>
        </div>
      </div>
    </div>
  );
}
