import React from 'react';

import { cn } from '../../utils/cn';

import { Button } from './Button';

export interface EmptyProps {
  image?: React.ReactNode | string;
  imageStyle?: React.CSSProperties;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Empty: React.FC<EmptyProps> = ({
  image,
  imageStyle,
  description = '暂无数据',
  children,
  className,
  style,
}) => {
  // 默认图标
  const defaultImage = <span className="w-16 h-16 text-gray-300 dark:text-gray-600">📥</span>;

  // 渲染图片/图标
  const renderImage = () => {
    if (image === null) return null;

    if (typeof image === 'string') {
      return <img src={image} alt="Empty" className="max-w-full h-auto" style={imageStyle} />;
    }

    if (React.isValidElement(image)) {
      return <div style={imageStyle}>{image}</div>;
    }

    return <div style={imageStyle}>{defaultImage}</div>;
  };

  return (
    <div
      className={cn(
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'py-12',
        'px-4',
        'text-center',
        className
      )}
      style={style}
    >
      {/* 图片/图标 */}
      <div className="mb-4">{renderImage()}</div>

      {/* 描述文字 */}
      {description && (
        <div className="mb-4">
          {typeof description === 'string' ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
          ) : (
            description
          )}
        </div>
      )}

      {/* 自定义内容 */}
      {children && <div>{children}</div>}
    </div>
  );
};

// 预设的空状态组件
export interface PresetEmptyProps {
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// 无数据状态
const NoData: React.FC<PresetEmptyProps> = ({
  description = '暂无数据',
  action,
  className,
  style,
}) => {
  return (
    <Empty
      image={<span className="w-16 h-16 text-gray-300 dark:text-gray-600">📥</span>}
      description={description}
      className={className}
      style={style}
    >
      {action}
    </Empty>
  );
};

// 搜索无结果状态
const NoSearchResult: React.FC<PresetEmptyProps & { keyword?: string }> = ({
  description,
  keyword,
  action,
  className,
  style,
}) => {
  const defaultDescription = keyword ? `未找到与 "${keyword}" 相关的结果` : '未找到相关结果';

  return (
    <Empty
      image={<span className="w-16 h-16 text-gray-300 dark:text-gray-600">🔍</span>}
      description={description || defaultDescription}
      className={className}
      style={style}
    >
      {action}
    </Empty>
  );
};

// 网络错误状态
const NetworkError: React.FC<PresetEmptyProps> = ({
  description = '网络连接失败',
  action,
  className,
  style,
}) => {
  return (
    <Empty
      image={<span className="w-16 h-16 text-gray-300 dark:text-gray-600">📶</span>}
      description={description}
      className={className}
      style={style}
    >
      {action || (
        <Button variant="outline" size="sm">
          重新加载
        </Button>
      )}
    </Empty>
  );
};

// 服务器错误状态
const ServerError: React.FC<PresetEmptyProps> = ({
  description = '服务器出错了',
  action,
  className,
  style,
}) => {
  return (
    <Empty
      image={<span className="w-16 h-16 text-yellow-400">⚠️</span>}
      description={description}
      className={className}
      style={style}
    >
      {action || (
        <Button variant="outline" size="sm">
          重试
        </Button>
      )}
    </Empty>
  );
};

// 权限不足状态
const NoPermission: React.FC<PresetEmptyProps> = ({
  description = '暂无权限访问',
  action,
  className,
  style,
}) => {
  return (
    <Empty
      image={
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
      }
      description={description}
      className={className}
      style={style}
    >
      {action}
    </Empty>
  );
};

// 建设中状态
const UnderConstruction: React.FC<PresetEmptyProps> = ({
  description = '功能建设中，敬请期待',
  action,
  className,
  style,
}) => {
  return (
    <Empty
      image={
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
          <span className="text-2xl">🚧</span>
        </div>
      }
      description={description}
      className={className}
      style={style}
    >
      {action}
    </Empty>
  );
};

// 自定义 SVG 空状态图标
const EmptyBox: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-16 h-16 text-gray-300 dark:text-gray-600', className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9l3-3 3 3"
    />
  </svg>
);

const EmptyFolder: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-16 h-16 text-gray-300 dark:text-gray-600', className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const EmptyDocument: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-16 h-16 text-gray-300 dark:text-gray-600', className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export {
  Empty,
  NoData,
  NoSearchResult,
  NetworkError,
  ServerError,
  NoPermission,
  UnderConstruction,
  EmptyBox,
  EmptyFolder,
  EmptyDocument,
};
export default Empty;
