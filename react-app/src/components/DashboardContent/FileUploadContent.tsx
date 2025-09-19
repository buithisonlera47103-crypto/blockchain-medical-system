import {
  Upload,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  X,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Download,
  Share2,
  Trash2,
  Cloud,
  HardDrive,
  Zap,
  Shield,
  Lock,
  Eye,
  Folder,
  Search,
  Filter,
} from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  progress: number;
  status: 'uploading' | 'success' | 'error' | 'encrypted';
  category: string;
  hash?: string;
  encrypted?: boolean;
}

const FileUploadContent: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragCounter, setDragCounter] = useState(0);

  // 文件类型映射
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf')) return FileText;
    if (type.includes('zip') || type.includes('rar')) return Archive;
    return File;
  };

  const getFileCategory = (type: string): string => {
    if (type.startsWith('image/')) return 'images';
    if (type.startsWith('video/')) return 'videos';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf') || type.includes('doc')) return 'documents';
    if (type.includes('zip') || type.includes('rar')) return 'archives';
    return 'others';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateFileHash = (): string => {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  // 拖拽处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  // 文件处理
  const handleFiles = async (fileList: File[]) => {
    for (const file of fileList) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedAt: new Date(),
        progress: 0,
        status: 'uploading',
        category: getFileCategory(file.type),
        hash: generateFileHash(),
        encrypted: encryptionEnabled,
      };

      setFiles(prev => [...prev, uploadedFile]);
      await simulateUpload(fileId);
    }
  };

  const simulateUpload = async (fileId: string) => {
    const totalSteps = 100;
    
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setUploadProgress(prev => ({ ...prev, [fileId]: i }));
      
      setFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { ...file, progress: i }
          : file
      ));
    }

    // 完成上传
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { 
            ...file, 
            status: encryptionEnabled ? 'encrypted' : 'success',
            progress: 100 
          }
        : file
    ));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 过滤文件
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 统计数据
  const stats = {
    total: files.length,
    uploading: files.filter(f => f.status === 'uploading').length,
    success: files.filter(f => f.status === 'success' || f.status === 'encrypted').length,
    error: files.filter(f => f.status === 'error').length,
    totalSize: files.reduce((acc, file) => acc + file.size, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900 p-6 lg:p-8">
      {/* 科技风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/8 via-purple-500/8 to-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-cyan-500/8 to-blue-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-green-500/6 to-emerald-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        {/* 科技网格 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 rounded-3xl mb-6 shadow-2xl hover:shadow-indigo-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-3xl animate-pulse"></div>
            <Cloud className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-700 via-purple-800 to-pink-900 dark:from-indigo-300 dark:via-purple-400 dark:to-pink-300 bg-clip-text text-transparent">
                智能文件云存储
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              采用<span className="font-semibold text-indigo-600 dark:text-indigo-400">端到端加密</span>技术的医疗文件安全存储，
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold"> 支持多格式，即时同步</span>
            </p>
          </div>

          {/* 统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.total} 个文件
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatFileSize(stats.totalSize)}
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  在线同步
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 上传区域 */}
        <div 
          className={`relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-dashed transition-all duration-500 mb-8 overflow-hidden ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.02] shadow-3xl shadow-indigo-500/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* 背景动画 */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${
            isDragOver ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 animate-pulse"></div>
          </div>

          <div className="relative p-12 lg:p-16 text-center">
            <div className="space-y-8">
              {/* 上传图标 */}
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-3xl transition-all duration-500 ${
                isDragOver 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 scale-110 rotate-12' 
                  : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 hover:scale-110'
              }`}>
                <Upload className={`w-16 h-16 transition-all duration-500 ${
                  isDragOver ? 'text-white animate-bounce' : 'text-indigo-600 dark:text-indigo-400'
                }`} />
              </div>

              {/* 文本内容 */}
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isDragOver ? '🚀 释放文件开始上传' : '🌟 拖拽或点击上传文件'}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  支持 PDF、图片、视频、音频等多种格式，单文件最大 100MB
                </p>

                {/* 支持的格式 */}
                <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
                  {[
                    { icon: FileText, label: 'PDF', color: 'text-red-500' },
                    { icon: Image, label: '图片', color: 'text-green-500' },
                    { icon: Video, label: '视频', color: 'text-blue-500' },
                    { icon: Music, label: '音频', color: 'text-purple-500' },
                    { icon: Archive, label: '压缩包', color: 'text-orange-500' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center space-x-2 bg-white/50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 上传按钮 */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleFileSelect}
                  className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center space-x-3">
                    <Upload className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span>选择文件</span>
                  </div>
                </button>

                {/* 加密选项 */}
                <div className="flex items-center space-x-3 bg-white/50 dark:bg-gray-700/50 rounded-2xl px-4 py-3">
                  <Lock className="w-5 h-5 text-green-500" />
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={(e) => setEncryptionEnabled(e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">端到端加密</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            className="hidden"
            accept="*/*"
          />
        </div>

        {/* 搜索和过滤控件 */}
        {files.length > 0 && (
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* 搜索 */}
              <div className="lg:col-span-2">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="🔍 搜索文件名..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* 分类过滤 */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none"
                >
                  <option value="all">📁 所有文件</option>
                  <option value="images">🖼️ 图片</option>
                  <option value="videos">🎬 视频</option>
                  <option value="audio">🎵 音频</option>
                  <option value="documents">📄 文档</option>
                  <option value="archives">📦 压缩包</option>
                  <option value="others">📋 其他</option>
                </select>
                <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 视图切换 */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">视图模式:</span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🎯 网格视图
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    📋 列表视图
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                显示 <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredFiles.length}</span> / {files.length} 个文件
              </div>
            </div>
          </div>
        )}

        {/* 文件列表 */}
        {files.length > 0 ? (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'space-y-4'
          }`}>
            {filteredFiles.map((file, index) => {
              const IconComponent = getFileIcon(file.type);
              
              if (viewMode === 'grid') {
                return (
                  <div
                    key={file.id}
                    className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* 文件状态指示 */}
                    <div className="absolute top-3 right-3 flex items-center space-x-1">
                      {file.encrypted && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {file.status === 'success' || file.status === 'encrypted' ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : file.status === 'error' ? (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {/* 文件图标 */}
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>

                    {/* 文件信息 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{file.uploadedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        
                        {file.hash && (
                          <div className="text-xs font-mono text-gray-400 dark:text-gray-500 truncate">
                            Hash: {file.hash}
                          </div>
                        )}
                      </div>

                      {/* 上传进度 */}
                      {file.status === 'uploading' && (
                        <div className="space-y-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                            上传中... {file.progress}%
                          </div>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      {(file.status === 'success' || file.status === 'encrypted') && (
                        <div className="flex items-center justify-center space-x-2 pt-2">
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="预览"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // 列表视图
                return (
                  <div
                    key={file.id}
                    className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 hover:shadow-2xl transition-all duration-300 relative"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center space-x-6">
                      {/* 文件图标 */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <IconComponent className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      </div>

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {file.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {file.encrypted && (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Lock className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {file.status === 'success' || file.status === 'encrypted' ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : file.status === 'error' ? (
                              <AlertCircle className="w-6 h-6 text-red-500" />
                            ) : (
                              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{file.uploadedAt.toLocaleDateString('zh-CN')} {file.uploadedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {file.hash && (
                            <span className="font-mono">Hash: {file.hash}</span>
                          )}
                        </div>

                        {/* 上传进度 */}
                        {file.status === 'uploading' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">上传中...</span>
                              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{file.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      {(file.status === 'success' || file.status === 'encrypted') && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="下载"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="预览"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="分享"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:scale-110 transition-all duration-300"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="p-8 bg-gradient-to-br from-gray-100 to-indigo-100 dark:from-gray-800 dark:to-indigo-900/20 rounded-3xl inline-block mb-6">
              <Folder className="w-16 h-16 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无文件</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">拖拽文件到上方区域开始上传</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadContent;