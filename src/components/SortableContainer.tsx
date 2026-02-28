import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { VideoCard } from './VideoCard';
import type { VideoData } from '../types/video';
import { playDragStart, playDrop } from '../utils/sound';
import './SortableContainer.css';

/**
 * ソート可能なコンテナコンポーネント
 * ドラッグ&ドロップで動画の順序を並び替える
 */
interface SortableContainerProps {
  videos: VideoData[];
  onReorder: (videos: VideoData[]) => void;
}

export function SortableContainer({ videos, onReorder }: SortableContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // ドラッグ操作用のセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px以上動かしたらドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * ドラッグ開始時の処理
   */
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    playDragStart();
  };

  /**
   * ドラッグ終了時の処理
   */
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);

      const newVideos = arrayMove(videos, oldIndex, newIndex);
      onReorder(newVideos);
      playDrop();
    }

    setActiveId(null);
  };

  // ドラッグ中のアイテムを取得
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
        strategy={verticalListSortingStrategy}
      >
        <div className="sortable-container">
          {videos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeVideo ? (
          <div className="video-card video-card-overlay">
            <div className="video-card-number">{activeIndex + 1}</div>
            <div className="video-card-thumbnail">
              <img
                src={`${import.meta.env.BASE_URL}thumbnails/${activeVideo.id}.jpg`}
                alt={activeVideo.title}
              />
            </div>
            <div className="video-card-title">{activeVideo.title}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
