import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VideoData } from '../types/video';
import './VideoCard.css';

interface VideoCardProps {
  video: VideoData;
  index: number;
  total: number;
  swapTarget?: boolean;
  onMove: (from: number, direction: -1 | 1) => void;
}

export function VideoCard({ video, index, total, swapTarget, onMove }: VideoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const thumbnailPath = `${import.meta.env.BASE_URL}thumbnails/${video.id}.jpg`;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'video-card',
        isDragging ? 'dragging' : '',
        isOver ? 'drop-target' : '',
        swapTarget && isOver ? 'swap-hover' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="video-card-drag" {...attributes} {...listeners}>
        <div className="video-card-number" aria-hidden>
          {index + 1}
        </div>
        <div className="video-card-thumbnail">
          <img src={thumbnailPath} alt="" loading="lazy" />
        </div>
        <div className="video-card-title">{video.title}</div>
      </div>
      <div className="video-card-actions" aria-label={`${index + 1}番目のカードを移動`}>
        <button
          type="button"
          className="move-button"
          aria-label="上へ移動"
          disabled={isFirst}
          onClick={() => onMove(index, -1)}
        >
          ▲
        </button>
        <button
          type="button"
          className="move-button"
          aria-label="下へ移動"
          disabled={isLast}
          onClick={() => onMove(index, 1)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
