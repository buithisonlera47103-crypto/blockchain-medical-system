import { User, Edit3, Camera, Mail, Phone, MapPin, Calendar, Award, Activity } from 'lucide-react';
import React, { useState } from 'react';

const ProfileContent: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '张医生',
    title: '主治医师',
    department: '心血管内科',
    email: 'zhang.doctor@hospital.com',
    phone: '+86 138 0013 8000',
    location: '北京市朝阳区',
    joinDate: '2010-03-15',
    experience: '15年',
    specialties: ['心血管疾病', '高血压', '冠心病', '心律失常'],
    education: '北京医科大学 医学博士',
    certifications: ['执业医师证', '心血管专科医师', '急救培训证书'],
  });

  const stats = [
    { label: '患者总数', value: '2,847', icon: User, color: 'blue' },
    { label: '手术次数', value: '156', icon: Activity, color: 'green' },
    { label: '工作年限', value: '15年', icon: Calendar, color: 'purple' },
    { label: '专业认证', value: '3项', icon: Award, color: 'orange' },
  ];

  const recentActivities = [
    { date: '2024-01-15', activity: '完成心脏搭桥手术', patient: '患者李某' },
    { date: '2024-01-14', activity: '参与多学科会诊', patient: '患者王某' },
    { date: '2024-01-13', activity: '发表学术论文', patient: '《心血管疾病新进展》' },
    { date: '2024-01-12', activity: '指导实习医生', patient: '临床教学' },
  ];

  const handleSave = () => {
    setIsEditing(false);
    // 这里可以添加保存到后端的逻辑
  };

  const handleCancel = () => {
    setIsEditing(false);
    // 重置数据到原始状态
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">个人资料</h1>
            <p className="text-gray-600 dark:text-gray-400">查看和编辑个人信息</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>{isEditing ? '取消编辑' : '编辑资料'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 个人信息卡片 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-start space-x-6 mb-6">
              {/* 头像 */}
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
                {isEditing && (
                  <button className="absolute -bottom-2 -right-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 基本信息 */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        职位
                      </label>
                      <input
                        type="text"
                        value={profileData.title}
                        onChange={e => setProfileData({ ...profileData, title: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        科室
                      </label>
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={e =>
                          setProfileData({ ...profileData, department: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profileData.name}
                    </h2>
                    <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                      {profileData.title}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{profileData.department}</p>
                    <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>入职: {profileData.joinDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="w-4 h-4" />
                        <span>经验: {profileData.experience}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 联系信息 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">联系信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{profileData.email}</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{profileData.phone}</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={e => setProfileData({ ...profileData, location: e.target.value })}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{profileData.location}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 专业信息 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">专业信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    专业领域
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profileData.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    教育背景
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">{profileData.education}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    专业认证
                  </label>
                  <ul className="space-y-1">
                    {profileData.certifications.map((cert, index) => (
                      <li
                        key={index}
                        className="text-gray-700 dark:text-gray-300 flex items-center space-x-2"
                      >
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 编辑模式下的保存按钮 */}
            {isEditing && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    保存更改
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧统计和活动 */}
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">工作统计</h3>
            <div className="space-y-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const colorClasses = {
                  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  purple:
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                  orange:
                    'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                };
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 最近活动 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近活动</h3>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="border-l-2 border-blue-500 pl-4 py-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.activity}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{activity.patient}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{activity.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileContent;
