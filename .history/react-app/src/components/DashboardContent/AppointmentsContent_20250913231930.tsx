import { Calendar, Clock, User, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface Appointment {
  id: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  type: 'consultation' | 'follow_up' | 'examination' | 'surgery';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  location: string;
  notes?: string;
  patientName?: string;
  patientId?: string;
}

const AppointmentsContent: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let mockAppointments: Appointment[] = [];

    if (user.role === 'doctor') {
      // 医生视角：显示患者预约我的时间
      mockAppointments = [
        {
          id: '1',
          doctorName: user.name || '当前医生',
          department: '心内科',
          date: '2024-01-20',
          time: '09:00',
          type: 'consultation',
          status: 'scheduled',
          location: '门诊楼3楼301室',
          notes: '患者：张三 - 定期复查',
          patientName: '张三',
          patientId: 'P001234',
        },
        {
          id: '2',
          doctorName: user.name || '当前医生',
          department: '心内科',
          date: '2024-01-18',
          time: '14:30',
          type: 'follow_up',
          status: 'completed',
          location: '门诊楼3楼301室',
          notes: '患者：李四 - 血糖复查',
          patientName: '李四',
          patientId: 'P001235',
        },
      ];
    } else {
      // 患者视角：显示我预约的医生
      mockAppointments = [
        {
          id: '1',
          doctorName: '李医生',
          department: '心内科',
          date: '2024-01-20',
          time: '09:00',
          type: 'consultation',
          status: 'scheduled',
          location: '门诊楼3楼301室',
          notes: '定期复查',
        },
        {
          id: '2',
          doctorName: '王医生',
          department: '内分泌科',
          date: '2024-01-18',
          time: '14:30',
          type: 'follow_up',
          status: 'completed',
          location: '门诊楼2楼205室',
          notes: '血糖复查',
        },
      ];
    }

    setAppointments(mockAppointments);
    setLoading(false);
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <User className="w-5 h-5" />;
      case 'follow_up':
        return <Calendar className="w-5 h-5" />;
      case 'examination':
        return <AlertCircle className="w-5 h-5" />;
      case 'surgery':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      rescheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: '已预约',
      completed: '已完成',
      cancelled: '已取消',
      rescheduled: '已改期',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          预约管理
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {user?.role === 'doctor' ? '管理患者预约和时间安排' : '查看和管理您的医生预约'}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">总预约</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{appointments.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">已完成</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {appointments.filter(a => a.status === 'completed').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">待完成</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {appointments.filter(a => a.status === 'scheduled').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">已取消</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {appointments.filter(a => a.status === 'cancelled').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预约列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {user?.role === 'doctor' ? '患者预约列表' : '我的预约'}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      {getTypeIcon(appointment.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {user?.role === 'doctor' && appointment.patientName 
                          ? `患者: ${appointment.patientName}` 
                          : `医生: ${appointment.doctorName}`}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{appointment.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{appointment.location}</span>
                      </div>
                      <div>
                        <span className="font-medium">科室:</span> {appointment.department}
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">备注:</span> {appointment.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
                    查看详情
                  </button>
                  {appointment.status === 'scheduled' && (
                    <button className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
                      {user?.role === 'doctor' ? '修改时间' : '改期'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无预约记录
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {user?.role === 'doctor' ? '还没有患者预约您的时间' : '您还没有预约任何医生'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentsContent;
