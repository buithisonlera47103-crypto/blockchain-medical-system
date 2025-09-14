import { Calendar, Clock, Users, MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'clinic' | 'surgery' | 'consultation' | 'emergency';
  location: string;
  maxPatients: number;
  bookedPatients: number;
  status: 'active' | 'cancelled' | 'completed';
}

const ScheduleManagementContent: React.FC = () => {
  const [schedules] = useState<Schedule[]>([
    {
      id: '1',
      date: '2024-01-20',
      startTime: '08:00',
      endTime: '12:00',
      type: 'clinic',
      location: '门诊楼3楼301室',
      maxPatients: 20,
      bookedPatients: 15,
      status: 'active',
    },
    {
      id: '2',
      date: '2024-01-20',
      startTime: '14:00',
      endTime: '18:00',
      type: 'clinic',
      location: '门诊楼3楼301室',
      maxPatients: 20,
      bookedPatients: 18,
      status: 'active',
    },
    {
      id: '3',
      date: '2024-01-21',
      startTime: '09:00',
      endTime: '11:00',
      type: 'surgery',
      location: '手术室2',
      maxPatients: 3,
      bookedPatients: 2,
      status: 'active',
    },
    {
      id: '4',
      date: '2024-01-22',
      startTime: '08:00',
      endTime: '12:00',
      type: 'consultation',
      location: '会诊室A',
      maxPatients: 10,
      bookedPatients: 7,
      status: 'active',
    },
  ]);

  const getTypeLabel = (type: string) => {
    const labels = {
      clinic: '门诊',
      surgery: '手术',
      consultation: '会诊',
      emergency: '急诊',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      clinic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      surgery: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      consultation: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      emergency: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: '进行中',
      cancelled: '已取消',
      completed: '已完成',
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              排班管理
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              管理您的工作排班和时间安排
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>添加排班</span>
          </button>
        </div>
      </div>

      {/* 周视图选择器 */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                2024年1月第3周
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                上一周
              </button>
              <button className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                本周
              </button>
              <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                下一周
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 排班列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            本周排班
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {schedule.date}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(schedule.type)}`}>
                        {getTypeLabel(schedule.type)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(schedule.status)}`}>
                        {getStatusLabel(schedule.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{schedule.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{schedule.bookedPatients}/{schedule.maxPatients} 患者</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span>预约进度</span>
                  <span>{Math.round((schedule.bookedPatients / schedule.maxPatients) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(schedule.bookedPatients / schedule.maxPatients) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">本周排班</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">预约患者</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">156</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">工作时长</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">42h</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">工作地点</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagementContent;
