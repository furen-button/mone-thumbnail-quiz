import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VideoData } from '../types/video';
import './VideoCard.css';

/**
 * 動画カードコンポーネント
 * ドラッグ可能な動画サムネイルとタイトルを表示
 * 公開日は隠して表示しない
 */
interface VideoCardProps {
  video: VideoData;
  index: number;
}

export function VideoCard({ video, index }: VideoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // サムネイル画像のパス（public配下）
  const thumbnailPath = `${import.meta.env.BASE_URL}thumbnails/${video.id}.jpg`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`video-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="video-card-number">{index + 1}</div>
      <div className="video-card-thumbnail">
        <img
          src={thumbnailPath}
          alt={video.title}
          loading="lazy"
        />
      </div>
      <div className="video-card-title">
        {video.title}
      </div>
    </div>
  );
}
