import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

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
  patientName?: string; // 医生视角需要显示患者姓名
  patientId?: string;   // 医生视角需要显示患者ID
}

const AppointmentsContent: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // 根据用户角色模拟不同的预约数据
  useEffect(() => {
    if (!user) return;

    let mockAppointments: Appointment[] = [];

    if (user.role === 'doctor') {
      // 医生视角：显示患者预约我的时间
      mockAppointments = [
        {
          id: '1',
          doctorName: user.name || '当前医生', // 医生自己
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
        {
          id: '3',
          doctorName: user.name || '当前医生',
          department: '心内科',
          date: '2024-01-21',
          time: '10:30',
          type: 'consultation',
          status: 'scheduled',
          location: '门诊楼3楼301室',
          notes: '患者：王五 - 初诊',
          patientName: '王五',
          patientId: 'P001236',
        },
        {
          id: '4',
          doctorName: user.name || '当前医生',
          department: '心内科',
          date: '2024-01-22',
          time: '15:00',
          type: 'examination',
          status: 'scheduled',
          location: '门诊楼3楼301室',
          notes: '患者：赵六 - 心电图检查',
          patientName: '赵六',
          patientId: 'P001237',
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
      {
        id: '3',
        doctorName: '张医生',
        department: '影像科',
        date: '2024-01-25',
        time: '10:00',
        type: 'examination',
        status: 'scheduled',
        location: '医技楼1楼CT室',
      },
      {
        id: '4',
        doctorName: '赵医生',
        department: '骨科',
        date: '2024-01-15',
        time: '16:00',
        type: 'consultation',
        status: 'cancelled',
        location: '门诊楼4楼402室',
        notes: '患者临时有事取消',
      },
    ];

    setAppointments(mockAppointments);
    setLoading(false);
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <User className="w-5 h-5" />;
      case 'follow_up':
        return <Clock className="w-5 h-5" />;
      case 'examination':
        return <AlertCircle className="w-5 h-5" />;
      case 'surgery':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      consultation: '门诊咨询',
      follow_up: '复查随访',
      examination: '检查检验',
      surgery: '手术治疗',
    };
    return names[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'rescheduled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'rescheduled':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      scheduled: '已预约',
      completed: '已完成',
      cancelled: '已取消',
      rescheduled: '已改期',
    };
    return names[status] || status;
  };

  const filteredAppointments = appointments.filter(
    appointment => selectedStatus === 'all' || appointment.status === selectedStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的预约</h1>
          <p className="text-gray-600 dark:text-gray-400">查看和管理您的医疗预约记录</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总预约数</p>
              <p className="text-2xl font-bold text-blue-600">{appointments.length}</p>
            </div>
            <div className="text-3xl text-blue-500">📅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已预约</p>
              <p className="text-2xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
            <div className="text-3xl text-blue-500">⏰</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已完成</p>
              <p className="text-2xl font-bold text-green-600">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="text-3xl text-green-500">✅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已取消</p>
              <p className="text-2xl font-bold text-red-600">
                {appointments.filter(a => a.status === 'cancelled').length}
              </p>
            </div>
            <div className="text-3xl text-red-500">❌</div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">全部状态</option>
            <option value="scheduled">已预约</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
            <option value="rescheduled">已改期</option>
          </select>
        </div>
      </div>

      {/* 预约列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">预约记录</h2>
          <div className="space-y-4">
            {filteredAppointments.map(appointment => (
              <div
                key={appointment.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      {getTypeIcon(appointment.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {appointment.doctorName}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">·</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.department}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {appointment.date} {appointment.time}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{appointment.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">类型:</span>
                          <span>{getTypeName(appointment.type)}</span>
                        </div>
                        {appointment.notes && (
                          <div className="flex items-start space-x-2">
                            <span className="font-medium">备注:</span>
                            <span>{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}
                    >
                      {getStatusIcon(appointment.status)}
                      <span className="ml-1">{getStatusName(appointment.status)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              没有找到预约记录
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请尝试调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsContent;
