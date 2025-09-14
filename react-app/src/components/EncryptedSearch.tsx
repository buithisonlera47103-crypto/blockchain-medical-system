import {
  Search,
  Filter,
  Eye,
  Download,
  Share2,
  Calendar,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Shield,
  Key,
  Database,
} from 'lucide-react';
import React, { useState } from 'react';

interface EncryptedSearchQuery {
  encryptedQuery: string;
  searchType: 'content' | 'metadata' | 'both';
  dateRange?: {
    start: string;
    end: string;
  };
  department?: string;
  recordType?: string;
  patientId?: string;
}

interface EncryptedSearchResult {
  recordId: string;
  encryptedIndex: string;
  matchScore: number;
  hasAccess: boolean;
  metadata: {
    department: string;
    recordType: string;
    createdAt: string;
    fileSize: string;
  };
  accessLevel: 'none' | 'metadata' | 'full';
}

interface SearchStats {
  totalResults: number;
  accessibleResults: number;
  searchTime: number;
  encryptionTime: number;
  decryptionTime: number;
}

const EncryptedSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [encryptedQuery, setEncryptedQuery] = useState('');
  const [searchType, setSearchType] = useState<'content' | 'metadata' | 'both'>('both');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRecordType, setSelectedRecordType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchResults, setSearchResults] = useState<EncryptedSearchResult[]>([]);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Simulate encryption of search query
  const encryptSearchQuery = async (query: string): Promise<string> => {
    setEncrypting(true);
    // Simulate encryption process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock encrypted query (in real implementation, this would use actual encryption)
    const encrypted = btoa(query + '_encrypted_' + Date.now());
    setEncrypting(false);
    return encrypted;
  };

  // Simulate decryption of search results
  const decryptSearchResults = async (
    encryptedResults: any[]
  ): Promise<EncryptedSearchResult[]> => {
    setDecrypting(true);
    // Simulate decryption process
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock decrypted results
    const decrypted = encryptedResults.map(result => ({
      ...result,
      decryptedContent: atob(result.encryptedIndex || ''),
    }));

    setDecrypting(false);
    return decrypted;
  };

  // Handle encrypted search
  const handleEncryptedSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      // Step 1: Encrypt the search query
      const encryptionStartTime = Date.now();
      const encrypted = await encryptSearchQuery(searchQuery);
      const encryptionTime = Date.now() - encryptionStartTime;
      setEncryptedQuery(encrypted);

      // Step 2: Submit encrypted query to backend API
      const searchRequest: EncryptedSearchQuery = {
        encryptedQuery: encrypted,
        searchType,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        recordType: selectedRecordType !== 'all' ? selectedRecordType : undefined,
      };

      // Call the encrypted search API
      const response = await fetch('/api/v1/search/encrypted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('emr_token')}`,
        },
        body: JSON.stringify(searchRequest),
      });

      if (!response.ok) {
        throw new Error(`搜索失败: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '搜索失败');
      }

      // Step 3: Client-side decryption of accessible results
      const decryptionStartTime = Date.now();
      const decryptedResults = await decryptSearchResults(result.data.results);
      const decryptionTime = Date.now() - decryptionStartTime;

      const totalTime = Date.now() - startTime;

      setSearchResults(decryptedResults);
      setSearchStats({
        totalResults: result.data.stats.totalResults,
        accessibleResults: result.data.stats.accessibleResults,
        searchTime: totalTime,
        encryptionTime,
        decryptionTime,
      });
    } catch (error: any) {
      console.error('Encrypted search failed:', error);
      alert(`加密搜索失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'full':
        return <Unlock className="w-4 h-4 text-green-600" />;
      case 'metadata':
        return <Lock className="w-4 h-4 text-yellow-600" />;
      case 'none':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Lock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="encrypted-search space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-purple-600" />
            加密搜索
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Key className="w-4 h-4" />
            <span>端到端加密</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="输入搜索关键词（将被加密处理）..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={e => e.key === 'Enter' && handleEncryptedSearch()}
              />
            </div>

            <select
              value={searchType}
              onChange={e => setSearchType(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="both">内容+元数据</option>
              <option value="content">仅内容</option>
              <option value="metadata">仅元数据</option>
            </select>

            <button
              onClick={handleEncryptedSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  搜索中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  加密搜索
                </>
              )}
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center text-sm text-purple-600 hover:text-purple-700"
          >
            <Filter className="w-4 h-4 mr-1" />
            高级筛选
          </button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">科室</label>
                <select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">所有科室</option>
                  <option value="内科">内科</option>
                  <option value="心内科">心内科</option>
                  <option value="放射科">放射科</option>
                  <option value="外科">外科</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">记录类型</label>
                <select
                  value={selectedRecordType}
                  onChange={e => setSelectedRecordType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">所有类型</option>
                  <option value="诊断报告">诊断报告</option>
                  <option value="检查报告">检查报告</option>
                  <option value="处方记录">处方记录</option>
                  <option value="影像资料">影像资料</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期范围</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encryption Status */}
      {(encrypting || decrypting || encryptedQuery) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            加密处理状态
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">查询加密</span>
              {encrypting ? (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">加密中...</span>
                </div>
              ) : encryptedQuery ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">已完成</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">等待中</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">结果解密</span>
              {decrypting ? (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">解密中...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">已完成</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">等待中</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Statistics */}
      {searchStats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            搜索统计
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{searchStats.totalResults}</div>
              <div className="text-sm text-gray-500">总结果数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {searchStats.accessibleResults}
              </div>
              <div className="text-sm text-gray-500">可访问</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{searchStats.searchTime}ms</div>
              <div className="text-sm text-gray-500">搜索时间</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {searchStats.encryptionTime}ms
              </div>
              <div className="text-sm text-gray-500">加密时间</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{searchStats.decryptionTime}ms</div>
              <div className="text-sm text-gray-500">解密时间</div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              搜索结果
            </h3>
            <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
              {searchResults.length} 条记录
            </span>
          </div>

          <div className="space-y-3">
            {searchResults.map(result => (
              <div
                key={result.recordId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-800">
                        {result.metadata.recordType}
                      </span>
                      <span className="text-sm text-gray-500">{result.metadata.department}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(result.matchScore)}`}
                      >
                        匹配度: {(result.matchScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(result.metadata.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Database className="w-4 h-4" />
                        <span>{result.metadata.fileSize}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getAccessLevelIcon(result.accessLevel)}
                      <span className="text-sm text-gray-600">
                        {result.accessLevel === 'full'
                          ? '完全访问'
                          : result.accessLevel === 'metadata'
                            ? '仅元数据'
                            : '无访问权限'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {result.hasAccess ? (
                      <div className="flex space-x-2">
                        <button className="p-1 text-gray-500 hover:text-blue-600" title="查看">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-500 hover:text-green-600" title="下载">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-500 hover:text-purple-600" title="分享">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        申请权限
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EncryptedSearch;
