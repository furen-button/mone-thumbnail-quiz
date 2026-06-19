import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VideoData } from '../types/video';
import './VideoCard.css';

interface VideoCardProps {
  video: VideoData;
  index: number;
  total: number;
  swapTarget?: boolean;
  hintLevel?: number;
  positionCorrect?: boolean;
  extremeBadge?: 'oldest' | 'newest' | null;
  onMove: (from: number, direction: -1 | 1) => void;
}

function formatHintDate(iso: string, level: number): string | null {
  if (level < 1) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}年`;
}

export function VideoCard({
  video,
  index,
  total,
  swapTarget,
  hintLevel = 0,
  positionCorrect = false,
  extremeBadge = null,
  onMove,
}: VideoCardProps) {
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
  const dateHint = formatHintDate(video.publishedAt, hintLevel);
  const extremeContent =
    extremeBadge === 'oldest' ? (
      <>
        <span className="extreme-arrow" aria-hidden>▲</span>最古
      </>
    ) : extremeBadge === 'newest' ? (
      <>
        最新<span className="extreme-arrow" aria-hidden>▼</span>
      </>
    ) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'video-card',
        isDragging ? 'dragging' : '',
        isOver ? 'drop-target' : '',
        swapTarget && isOver ? 'swap-hover' : '',
        positionCorrect ? 'position-correct' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {extremeContent && (
        <span className={`video-card-extreme-badge badge-${extremeBadge}`}>
          {extremeContent}
        </span>
      )}
      <div className="video-card-drag" {...attributes} {...listeners}>
        <div className="video-card-number" aria-hidden>
          {index + 1}
        </div>
        <div className="video-card-thumbnail">
          <img src={thumbnailPath} alt="" loading="lazy" />
        </div>
        <div className="video-card-meta">
          {dateHint && <span className="video-card-date-hint">{dateHint}</span>}
          <div className="video-card-title">{video.title}</div>
        </div>
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
