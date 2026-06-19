import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  type SortingStrategy,
} from '@dnd-kit/sortable';
import { VideoCard } from './VideoCard';
import type { VideoData } from '../types/video';
import { playDragStart, playDrop } from '../utils/sound';
import './SortableContainer.css';

interface SortableContainerProps {
  videos: VideoData[];
  mode?: 'swap';
  onReorder: (videos: VideoData[]) => void;
  hintLevel?: number;
  positionCorrects?: boolean[];
  oldestId?: string | null;
  newestId?: string | null;
}

function reorder(videos: VideoData[], from: number, to: number): VideoData[] {
  const next = [...videos];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * 入れ替えモード用のソート戦略。
 * active と over のカードだけが互いの位置へ translateY し、それ以外はそのまま。
 */
const swapSortingStrategy: SortingStrategy = ({ activeIndex, overIndex, index, rects }) => {
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return null;
  if (index === activeIndex) {
    return {
      x: 0,
      y: rects[overIndex].top - rects[activeIndex].top,
      scaleX: 1,
      scaleY: 1,
    };
  }
  if (index === overIndex) {
    return {
      x: 0,
      y: rects[activeIndex].top - rects[overIndex].top,
      scaleX: 1,
      scaleY: 1,
    };
  }
  return null;
};

export function SortableContainer({
  videos,
  onReorder,
  hintLevel = 0,
  positionCorrects,
  oldestId = null,
  newestId = null,
}: SortableContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    playDragStart();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const from = videos.findIndex((v) => v.id === active.id);
      const to = videos.findIndex((v) => v.id === over.id);
      if (from !== -1 && to !== -1) {
        onReorder(reorder(videos, from, to));
        playDrop();
      }
    }
    setActiveId(null);
  };

  // ↑↓ ボタンは隣接移動なので arrayMove ±1 と同じ
  const handleMove = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= videos.length) return;
    onReorder(arrayMove(videos, from, to));
    playDrop();
  };

  const activeVideo = activeId ? videos.find((v) => v.id === activeId) : null;
  const activeIndex = activeVideo ? videos.findIndex((v) => v.id === activeId) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={videos.map((v) => v.id)}
        strategy={swapSortingStrategy}
      >
        <ol className="sortable-container" aria-label="並び替え対象の動画">
          {videos.map((video, index) => {
            const extremeBadge: 'oldest' | 'newest' | null =
              video.id === oldestId
                ? 'oldest'
                : video.id === newestId
                  ? 'newest'
                  : null;
            return (
              <li key={video.id} className="sortable-item">
                <VideoCard
                  video={video}
                  index={index}
                  total={videos.length}
                  swapTarget={activeId !== null && activeId !== video.id}
                  hintLevel={hintLevel}
                  positionCorrect={positionCorrects?.[index] ?? false}
                  extremeBadge={extremeBadge}
                  onMove={handleMove}
                />
              </li>
            );
          })}
        </ol>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeVideo ? (
          <div className="video-card video-card-overlay">
            <div className="video-card-drag">
              <div className="video-card-number">{activeIndex + 1}</div>
              <div className="video-card-thumbnail">
                <img
                  src={`${import.meta.env.BASE_URL}thumbnails/${activeVideo.id}.jpg`}
                  alt=""
                />
              </div>
              <div className="video-card-title">{activeVideo.title}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
