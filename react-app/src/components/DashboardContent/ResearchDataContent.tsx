import { BarChart3, TrendingUp, Database, Download, Filter, Search } from 'lucide-react';
import React, { useState } from 'react';

interface ResearchProject {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  participants: number;
  dataPoints: number;
  startDate: string;
  endDate?: string;
  category: 'clinical_trial' | 'observational' | 'retrospective' | 'meta_analysis';
}

const ResearchDataContent: React.FC = () => {
  const [projects] = useState<ResearchProject[]>([
    {
      id: '1',
      title: '心血管疾病预防研究',
      description: '针对高血压患者的生活方式干预效果研究',
      status: 'active',
      participants: 156,
      dataPoints: 2340,
      startDate: '2023-06-01',
      category: 'clinical_trial',
    },
    {
      id: '2',
      title: '糖尿病并发症观察研究',
      description: '2型糖尿病患者长期并发症发生率观察',
      status: 'active',
      participants: 89,
      dataPoints: 1567,
      startDate: '2023-09-15',
      category: 'observational',
    },
    {
      id: '3',
      title: '抗生素使用回顾性分析',
      description: '过去5年抗生素使用模式和耐药性分析',
      status: 'completed',
      participants: 2340,
      dataPoints: 15678,
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      category: 'retrospective',
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getCategoryLabel = (category: string) => {
    const labels = {
      clinical_trial: '临床试验',
      observational: '观察性研究',
      retrospective: '回顾性研究',
      meta_analysis: '荟萃分析',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      clinical_trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      observational: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      retrospective: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      meta_analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: '进行中',
      completed: '已完成',
      paused: '暂停',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredProjects = projects.filter(project => {
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              科研数据
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              管理和分析医学研究项目数据
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>新建项目</span>
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">活跃项目</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter(p => p.status === 'active').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">总参与者</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.reduce((sum, p) => sum + p.participants, 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">数据点</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.reduce((sum, p) => sum + p.dataPoints, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Download className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">已完成</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter(p => p.status === 'completed').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索研究项目..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">全部类型</option>
                <option value="clinical_trial">临床试验</option>
                <option value="observational">观察性研究</option>
                <option value="retrospective">回顾性研究</option>
                <option value="meta_analysis">荟萃分析</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {project.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(project.category)}`}>
                    {getCategoryLabel(project.category)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {project.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">参与者</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {project.participants.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">数据点</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {project.dataPoints.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">开始日期</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {project.startDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">结束日期</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {project.endDate || '进行中'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>查看数据</span>
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                  <Download className="w-4 h-4" />
                  <span>导出</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无研究项目
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            没有找到符合条件的研究项目
          </p>
        </div>
      )}
    </div>
  );
};

export default ResearchDataContent;
