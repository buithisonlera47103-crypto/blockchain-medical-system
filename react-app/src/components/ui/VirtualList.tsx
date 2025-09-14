import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { cn } from '../../lib/utils';

export interface VirtualListProps<T> {
  data: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
  estimatedItemHeight?: number;
  itemKey?: (item: T, index: number) => string | number;
}

interface ItemMetadata {
  offset: number;
  size: number;
}

const VirtualList = <T,>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  scrollToIndex,
  estimatedItemHeight = 50,
  itemKey,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();
  const itemMetadataMapRef = useRef<Map<number, ItemMetadata>>(new Map());
  const lastMeasuredIndexRef = useRef(-1);

  // 获取项目高度
  const getItemHeight = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(data[index], index);
      }
      return itemHeight;
    },
    [itemHeight, data]
  );

  // 获取项目元数据
  const getItemMetadata = useCallback(
    (index: number): ItemMetadata => {
      const cache = itemMetadataMapRef.current;

      if (cache.has(index)) {
        return cache.get(index)!;
      }

      let offset = 0;
      for (let i = 0; i <= Math.min(index, lastMeasuredIndexRef.current); i++) {
        const metadata = cache.get(i);
        if (metadata) {
          offset = metadata.offset + metadata.size;
        }
      }

      for (let i = lastMeasuredIndexRef.current + 1; i <= index; i++) {
        const size = getItemHeight(i);
        cache.set(i, { offset, size });
        offset += size;
        lastMeasuredIndexRef.current = i;
      }

      return cache.get(index)!;
    },
    [getItemHeight]
  );

  // 计算总高度
  const getTotalSize = useCallback(() => {
    const lastIndex = data.length - 1;
    return lastIndex >= 0 ? getItemMetadata(lastIndex).offset + getItemMetadata(lastIndex).size : 0;
  }, [data.length, getItemMetadata]);

  // 查找起始索引
  const findStartIndex = useCallback(
    (scrollTop: number) => {
      let low = 0;
      let high = data.length - 1;

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const metadata = getItemMetadata(middle);

        if (metadata.offset === scrollTop) {
          return middle;
        } else if (metadata.offset < scrollTop) {
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      return Math.max(0, high);
    },
    [data.length, getItemMetadata]
  );

  // 计算可见范围
  const getVisibleRange = useMemo(() => {
    const startIndex = findStartIndex(scrollTop);
    const endIndex = Math.min(
      data.length - 1,
      startIndex +
        Math.ceil(
          containerHeight / (typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight)
        )
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex: Math.min(data.length - 1, endIndex + overscan),
    };
  }, [
    scrollTop,
    containerHeight,
    data.length,
    findStartIndex,
    itemHeight,
    estimatedItemHeight,
    overscan,
  ]);

  // 处理滚动
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = event.currentTarget.scrollTop;

      setScrollTop(newScrollTop);
      setIsScrolling(true);
      onScroll?.(newScrollTop);

      // 清除之前的超时
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      // 设置新的超时来检测滚动结束
      scrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    },
    [onScroll]
  );

  // 滚动到指定索引
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollElementRef.current) {
      const metadata = getItemMetadata(scrollToIndex);
      scrollElementRef.current.scrollTop = metadata.offset;
    }
  }, [scrollToIndex, getItemMetadata]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  // 重置缓存当数据改变时
  useEffect(() => {
    itemMetadataMapRef.current.clear();
    lastMeasuredIndexRef.current = -1;
  }, [data]);

  const totalSize = getTotalSize();
  const { startIndex, endIndex } = getVisibleRange;

  // 生成可见项目
  const visibleItems = [];
  for (let index = startIndex; index <= endIndex; index++) {
    const item = data[index];
    const metadata = getItemMetadata(index);
    const key = itemKey ? itemKey(item, index) : index;

    const style: React.CSSProperties = {
      position: 'absolute',
      top: metadata.offset,
      left: 0,
      right: 0,
      height: metadata.size,
    };

    visibleItems.push(
      <div key={key} style={style}>
        {renderItem(item, index, style)}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 容器高度占位符 */}
      <div style={{ height: totalSize, position: 'relative' }}>{visibleItems}</div>

      {/* 滚动指示器 */}
      {isScrolling && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"
        >
          {startIndex + 1} - {endIndex + 1} / {data.length}
        </motion.div>
      )}
    </div>
  );
};

// 固定高度虚拟列表的简化版本
export interface SimpleVirtualListProps<T> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export const SimpleVirtualList = <T,>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  gap = 0,
  loading = false,
  loadingComponent,
  emptyComponent,
}: SimpleVirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可见项目
  const itemSize = itemHeight + gap;
  const visibleStart = Math.floor(scrollTop / itemSize);
  const visibleEnd = Math.min(data.length - 1, Math.ceil((scrollTop + containerHeight) / itemSize));

  const totalHeight = data.length * itemSize - gap;
  const offsetY = visibleStart * itemSize;

  if (loading && loadingComponent) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ height: containerHeight }}
      >
        {loadingComponent}
      </div>
    );
  }

  if (data.length === 0 && emptyComponent) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {data.slice(visibleStart, visibleEnd + 1).map((item, index) => (
            <div
              key={visibleStart + index}
              style={{
                height: itemHeight,
                marginBottom: index < visibleEnd - visibleStart ? gap : 0,
              }}
            >
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualList;
