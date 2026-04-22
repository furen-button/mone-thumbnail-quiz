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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { VideoCard } from './VideoCard';
import type { VideoData } from '../types/video';
import type { MoveMode } from '../utils/gameLogic';
import { playDragStart, playDrop } from '../utils/sound';
import './SortableContainer.css';

interface SortableContainerProps {
  videos: VideoData[];
  mode: MoveMode;
  onReorder: (videos: VideoData[]) => void;
}

function reorder(videos: VideoData[], from: number, to: number, mode: MoveMode): VideoData[] {
  if (mode === 'swap') {
    const next = [...videos];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  }
  return arrayMove(videos, from, to);
}

export function SortableContainer({ videos, mode, onReorder }: SortableContainerProps) {
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
        onReorder(reorder(videos, from, to, mode));
        playDrop();
      }
    }
    setActiveId(null);
  };

  // ↑↓ ボタンは隣接移動なので insert/swap どちらでも結果は同じ (swap 隣接 = arrayMove ±1)
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
        // swap モードではドラッグ中に他のカードを動かさない (静的な位置を維持)
        strategy={mode === 'swap' ? undefined : verticalListSortingStrategy}
      >
        <ol className="sortable-container" aria-label="並び替え対象の動画">
          {videos.map((video, index) => (
            <li key={video.id} className="sortable-item">
              <VideoCard
                video={video}
                index={index}
                total={videos.length}
                swapTarget={mode === 'swap' && activeId !== null && activeId !== video.id}
                onMove={handleMove}
              />
            </li>
          ))}
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
