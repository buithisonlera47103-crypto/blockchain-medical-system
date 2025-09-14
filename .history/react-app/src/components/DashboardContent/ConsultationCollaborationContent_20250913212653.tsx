import { Users, Play, MessageCircle, FileText, Clock, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  primaryDoctor: string;
  consultingDoctors: string[];
  department: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  scheduledAt?: string;
  description: string;
  attachments: number;
}

const ConsultationCollaborationContent: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([
    {
      id: '1',
      patientName: '张三',
      patientId: 'P001234',
      primaryDoctor: '李医生',
      consultingDoctors: ['王医生', '赵医生'],
      department: '心内科',
      urgency: 'high',
      status: 'in_progress',
      createdAt: '2024-01-20 09:00',
      scheduledAt: '2024-01-20 14:00',
      description: '患者出现胸痛症状，需要心内科和急诊科联合会诊',
      attachments: 3,
    },
    {
      id: '2',
      patientName: '李四',
      patientId: 'P001235',
      primaryDoctor: '王医生',
      consultingDoctors: ['李医生', '陈医生', '刘医生'],
      department: '神经内科',
      urgency: 'medium',
      status: 'pending',
      createdAt: '2024-01-20 10:30',
      scheduledAt: '2024-01-21 09:00',
      description: '疑似脑血管疾病，需要多科室联合诊断',
      attachments: 5,
    },
    {
      id: '3',
      patientName: '王五',
      patientId: 'P001236',
      primaryDoctor: '赵医生',
      consultingDoctors: ['李医生'],
      department: '外科',
      urgency: 'urgent',
      status: 'pending',
      createdAt: '2024-01-20 11:15',
      description: '急性腹痛，需要紧急会诊',
      attachments: 2,
    },
  ]);

  const [activeTab, setActiveTab] = useState('all');

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急',
    };
    return labels[urgency as keyof typeof labels] || urgency;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '待开始',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredConsultations = consultations.filter(consultation => {
    if (activeTab === 'all') return true;
    return consultation.status === activeTab;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              会诊协作
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              多科室医生协作诊断和治疗
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>发起会诊</span>
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: '全部', count: consultations.length },
              { key: 'pending', label: '待开始', count: consultations.filter(c => c.status === 'pending').length },
              { key: 'in_progress', label: '进行中', count: consultations.filter(c => c.status === 'in_progress').length },
              { key: 'completed', label: '已完成', count: consultations.filter(c => c.status === 'completed').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 会诊列表 */}
      <div className="space-y-4">
        {filteredConsultations.map((consultation) => (
          <div key={consultation.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    患者：{consultation.patientName} ({consultation.patientId})
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(consultation.urgency)}`}>
                    {getUrgencyLabel(consultation.urgency)}优先级
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(consultation.status)}`}>
                    {getStatusLabel(consultation.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">主治医生</div>
                    <div className="font-medium text-gray-900 dark:text-white">{consultation.primaryDoctor}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">科室</div>
                    <div className="font-medium text-gray-900 dark:text-white">{consultation.department}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">会诊医生</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {consultation.consultingDoctors.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">预定时间</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {consultation.scheduledAt || '待安排'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">病情描述</div>
                  <p className="text-gray-900 dark:text-white">{consultation.description}</p>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>创建时间：{consultation.createdAt}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{consultation.attachments} 个附件</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                  <Video className="w-4 h-4" />
                  <span>视频会诊</span>
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>讨论</span>
                </button>
                {consultation.status === 'pending' && (
                  <button className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>接受会诊</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredConsultations.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无会诊记录
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            当前没有{activeTab === 'all' ? '' : getStatusLabel(activeTab)}的会诊记录
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsultationCollaborationContent;
