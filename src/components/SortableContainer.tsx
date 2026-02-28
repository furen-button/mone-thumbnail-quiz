import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { VideoCard } from './VideoCard';
import type { VideoData } from '../types/video';
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
   * ドラッグ終了時の処理
   */
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);

      const newVideos = arrayMove(videos, oldIndex, newIndex);
      onReorder(newVideos);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
    </DndContext>
  );
}
