import { Phone, AlertTriangle, Clock, MapPin, User } from 'lucide-react';
import React, { useState } from 'react';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
}

const EmergencyContactContent: React.FC = () => {
  const [contacts] = useState<EmergencyContact[]>([
    {
      id: '1',
      name: '张小明',
      relationship: '配偶',
      phone: '138-0000-1234',
      email: 'zhang.xiaoming@email.com',
      address: '北京市朝阳区xxx街道xxx号',
      isPrimary: true,
    },
    {
      id: '2',
      name: '李大华',
      relationship: '子女',
      phone: '139-0000-5678',
      email: 'li.dahua@email.com',
      isPrimary: false,
    },
  ]);

  const [showAddForm] = useState(false);

  const emergencyServices = [
    {
      name: '急救中心',
      phone: '120',
      description: '医疗急救服务',
      color: 'bg-red-500',
    },
    {
      name: '火警',
      phone: '119',
      description: '火灾救援服务',
      color: 'bg-orange-500',
    },
    {
      name: '报警',
      phone: '110',
      description: '公安报警服务',
      color: 'bg-blue-500',
    },
    {
      name: '医院急诊',
      phone: '010-12345678',
      description: '本院急诊科',
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              紧急联系
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              管理紧急联系人和快速拨打急救电话
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            添加联系人
          </button>
        </div>
      </div>

      {/* 紧急服务 */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          紧急服务电话
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {emergencyServices.map((service, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 ${service.color} rounded-lg flex items-center justify-center`}>
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {service.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {service.description}
                  </p>
                </div>
              </div>
              <button className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors">
                {service.phone}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 紧急联系人 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          紧急联系人
        </h3>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {contact.name}
                      </h4>
                      {contact.isPrimary && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                          主要联系人
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">关系:</span>
                        <span>{contact.relationship}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">邮箱:</span>
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>拨打</span>
                  </button>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    编辑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 紧急情况指南 */}
      <div className="mt-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                紧急情况处理指南
              </h4>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                <p>• 遇到生命危险情况，立即拨打120急救电话</p>
                <p>• 保持冷静，清楚说明地址和病情</p>
                <p>• 如果患者失去意识，检查呼吸和脉搏</p>
                <p>• 不要移动严重受伤的患者，除非有生命危险</p>
                <p>• 等待救援期间，持续观察患者状态</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近紧急联系记录 */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          最近联系记录
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无紧急联系记录</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContactContent;
