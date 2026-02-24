import { useState, useCallback } from 'react';

export interface DragItem<T> {
  item: T;
  index: number;
}

export interface UseDragDropResult<T> {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (index: number, e: React.DragEvent) => void;
  handleDragOver: (index: number, e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (index: number, e: React.DragEvent) => void;
  handleDragEnd: (e: React.DragEvent) => void;
}

export function useDragDrop<T>(
  items: T[],
  onReorder: (items: T[]) => void
): UseDragDropResult<T> {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget as unknown as string);
    }
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);

      if (draggedIndex === null || draggedIndex === index) {
        setDraggedIndex(null);
        return;
      }

      const newItems = [...items];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, draggedItem);

      onReorder(newItems);
      setDraggedIndex(null);
    },
    [draggedIndex, items, onReorder]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
}
