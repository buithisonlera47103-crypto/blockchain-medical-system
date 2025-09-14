import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, AlertCircle } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { cn } from '../../lib/utils';

export interface LazyImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  placeholder?: string | React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  blurDataURL?: string;
  threshold?: number;
  rootMargin?: string;
  fadeInDuration?: number;
  showLoadingIndicator?: boolean;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onIntersect?: (isIntersecting: boolean) => void;
}

type ImageState = 'loading' | 'loaded' | 'error';

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  errorPlaceholder,
  blurDataURL,
  threshold = 0.1,
  rootMargin = '50px',
  fadeInDuration = 0.3,
  showLoadingIndicator = true,
  onLoad,
  onError,
  onIntersect,
  className,
  style,
  ...props
}) => {
  const [imageState, setImageState] = useState<ImageState>('loading');
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(blurDataURL || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // 加载图片
  const loadImage = useCallback(() => {
    if (!src) return;

    const img = new Image();

    img.onload = event => {
      setImageState('loaded');
      setImageSrc(src);
      onLoad?.(event as any);
    };

    img.onerror = event => {
      setImageState('error');
      onError?.(event as any);
    };

    img.src = src;
  }, [src, onLoad, onError]);

  // 创建 Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        onIntersect?.(intersecting);

        if (intersecting) {
          // 开始加载真实图片
          loadImage();
          // 停止观察
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, onIntersect, loadImage]);

  // 创建 Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        onIntersect?.(intersecting);

        if (intersecting) {
          // 开始加载真实图片
          loadImage();
          // 停止观察
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, onIntersect, loadImage]);

  // 重试加载
  const retryLoad = useCallback(() => {
    setImageState('loading');
    loadImage();
  }, [loadImage]);

  // 获取占位符内容
  const getPlaceholderContent = () => {
    if (imageState === 'error') {
      return (
        errorPlaceholder || (
          <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
            <AlertCircle className="h-8 w-8 mb-2" />
            <span className="text-sm">加载失败</span>
            <button
              onClick={retryLoad}
              className="text-xs text-blue-500 hover:text-blue-600 mt-1 underline"
            >
              重试
            </button>
          </div>
        )
      );
    }

    if (placeholder) {
      return typeof placeholder === 'string' ? (
        <img src={placeholder} alt="" className="w-full h-full object-cover" />
      ) : (
        placeholder
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
        <ImageIcon className="h-8 w-8 mb-2" />
        {showLoadingIndicator && imageState === 'loading' && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">加载中...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)} style={style}>
      {/* 占位符/错误状态 */}
      <AnimatePresence>
        {imageState !== 'loaded' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: fadeInDuration }}
            className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800"
          >
            {getPlaceholderContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 实际图片 */}
      {isIntersecting && (
        <motion.img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: imageState === 'loaded' ? 1 : 0 }}
          transition={{ duration: fadeInDuration }}
          className={cn(
            'w-full h-full object-cover',
            imageState === 'loaded' ? 'relative' : 'absolute inset-0'
          )}
          {...(props as any)}
        />
      )}

      {/* 加载指示器（覆盖在图片上） */}
      {imageState === 'loading' && isIntersecting && showLoadingIndicator && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-white/90 dark:bg-neutral-900/90 rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">加载中</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 预设的图片组件变体
export const LazyAvatar: React.FC<LazyImageProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  size = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <LazyImage
      className={cn('rounded-full', sizeClasses[size], className)}
      placeholder={
        <div className="w-full h-full rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
          <ImageIcon className="h-1/2 w-1/2 text-neutral-400" />
        </div>
      }
      {...props}
    />
  );
};

export const LazyThumbnail: React.FC<LazyImageProps & { aspectRatio?: string }> = ({
  aspectRatio = '16/9',
  className,
  style,
  ...props
}) => {
  return (
    <LazyImage
      className={cn('rounded-lg', className)}
      style={{
        aspectRatio,
        ...style,
      }}
      {...props}
    />
  );
};

// 图片画廊组件
export interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    placeholder?: string;
    thumbnail?: string;
  }>;
  columns?: number;
  gap?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}

export const LazyImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 4,
  onImageClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1,
          'grid-cols-2': columns === 2,
          'grid-cols-3': columns === 3,
          'grid-cols-4': columns === 4,
        },
        className
      )}
      style={{ gap: `${gap * 0.25}rem` }}
    >
      {images.map((image, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          className="cursor-pointer"
          onClick={() => onImageClick?.(index)}
        >
          <LazyThumbnail
            src={image.thumbnail || image.src}
            alt={image.alt}
            placeholder={image.placeholder}
            className="w-full h-auto"
            aspectRatio="1/1"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default LazyImage;
