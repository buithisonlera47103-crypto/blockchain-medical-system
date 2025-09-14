import QRCode from 'qrcode';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
import { MedicalRecord, RecordType } from '../types';
import { recordsAPI } from '../utils/api';

/**
 * 医疗记录详情页面组件
 * 显示单个医疗记录的详细信息和操作选项
 */
const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [accessHistory, setAccessHistory] = useState<any[]>([]);

  // 生成二维码函数在下方定义

  useEffect(() => {
    if (id) {
      fetchRecordDetail(id);
      fetchAccessHistory(id);
    }
  }, [id]);

  // 当record加载完成后生成二维码
  useEffect(() => {
    if (record && id) {
      // 直接调用生成二维码的逻辑
      const generateQR = async () => {
        try {
          const url = `${window.location.origin}/records/${id}`;
          const qrCodeDataUrl = await QRCode.toDataURL(url, {
            width: 256,
            margin: 2,
            color: {
              dark: isDark ? '#ffffff' : '#000000',
              light: isDark ? '#1f2937' : '#ffffff',
            },
          });
          setQrCodeUrl(qrCodeDataUrl);
        } catch (error) {
          console.error('生成二维码失败:', error);
        }
      };
      generateQR();
    }
  }, [record, id, isDark]);

  const fetchRecordDetail = async (recordId: string) => {
    try {
      setLoading(true);
      const response = await recordsAPI.getRecord(recordId);

      if (response.success && response.data) {
        setRecord(response.data);
      } else {
        // 模拟数据
        const mockRecord: MedicalRecord = {
          recordId: recordId,
          patientId: 'P001',
          creatorId: 'DR001',
          title: '患者心电图检查报告',
          description: '详细的心电图检查结果',
          recordType: RecordType.ECG,
          department: '心内科',
          ipfsCid: 'QmExample123',
          blockchainTxId: '0x123abc',
          fileSize: 1024000,
          fileHash: 'sha256hash',
          mimeType: 'application/pdf',
          isEncrypted: false,
          encryptionKeyId: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRecord(mockRecord);
      }
    } catch (error) {
      console.error('获取记录详情失败:', error);
      toast.error('获取记录详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessHistory = async (recordId: string) => {
    try {
      // 模拟访问历史数据
      const mockHistory = [
        {
          id: '1',
          action: '查看记录',
          user: 'Dr. Johnson',
          timestamp: new Date('2024-01-15T10:30:00'),
          ipAddress: '192.168.1.100',
        },
        {
          id: '2',
          action: '编辑记录',
          user: 'Dr. Smith',
          timestamp: new Date('2024-01-14T15:45:00'),
          ipAddress: '192.168.1.101',
        },
        {
          id: '3',
          action: '创建记录',
          user: 'Dr. Smith',
          timestamp: new Date('2024-01-13T09:15:00'),
          ipAddress: '192.168.1.101',
        },
      ];
      setAccessHistory(mockHistory);
    } catch (error) {
      console.error('获取访问历史失败:', error);
    }
  };

  // generateQRCode函数已移到useEffect中，不再需要单独定义

  const handleDownload = async () => {
    try {
      toast.info('开始下载记录文件...');
      // 这里应该调用下载API
      setTimeout(() => {
        toast.success('文件下载完成');
      }, 2000);
    } catch (error) {
      toast.error('下载失败');
    }
  };

  const handleEdit = () => {
    navigate(`/records/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这条记录吗？此操作不可撤销。')) {
      try {
        const response = await recordsAPI.deleteRecord(id!);
        if (response.success) {
          toast.success('记录删除成功');
          navigate('/records');
        } else {
          toast.error('删除失败');
        }
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/records/${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('链接已复制到剪贴板');
      })
      .catch(() => {
        toast.error('复制失败');
      });
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen pt-20 flex items-center justify-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <PulseLoader color={isDark ? '#60a5fa' : '#3b82f6'} size={15} />
      </div>
    );
  }

  if (!record) {
    return (
      <div
        className={`min-h-screen pt-20 flex items-center justify-center ${
          isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">记录未找到</h2>
          <button
            onClick={() => navigate('/records')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回记录列表
          </button>
        </div>
      </div>
    );
  }

  // 移除颜色显示逻辑，因为MedicalRecord类型中没有color字段

  return (
    <div
      className={`min-h-screen pt-20 p-6 ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* 头部导航 */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-600'
            }`}
          >
            <span>⬅️</span>
            <span>返回</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>⬇️</span>
              <span>下载</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📤</span>
              <span>分享</span>
            </button>

            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <span>✏️</span>
              <span>编辑</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <span>🗑️</span>
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息卡片 */}
          <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{record.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  record.isEncrypted ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
                }`}
              >
                {record.isEncrypted ? '已加密' : '未加密'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-500">👤</span>
                  <div>
                    <p className="text-sm text-gray-500">患者ID</p>
                    <p className="font-medium">{record.patientId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-green-500">👨‍⚕️</span>
                  <div>
                    <p className="text-sm text-gray-500">创建者ID</p>
                    <p className="font-medium">{record.creatorId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-purple-500">📅</span>
                  <div>
                    <p className="text-sm text-gray-500">创建时间</p>
                    <p className="font-medium">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-pink-500">🏥</span>
                  <div>
                    <p className="text-sm text-gray-500">科室</p>
                    <p className="font-medium">{record.department}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-orange-500">📋</span>
                  <div>
                    <p className="text-sm text-gray-500">记录类型</p>
                    <p className="font-medium">{record.recordType}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-yellow-500">📁</span>
                  <div>
                    <p className="text-sm text-gray-500">文件大小</p>
                    <p className="font-medium">{(record.fileSize / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 区块链信息 */}
          <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <span className="text-blue-500">🧊</span>
              <span>区块链信息</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-green-500">👆</span>
                <div>
                  <p className="text-sm text-gray-500">文件哈希</p>
                  <p className="font-mono text-sm break-all">
                    {record.fileHash.slice(0, 16)}...{record.fileHash.slice(-8)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-purple-500">🌐</span>
                <div>
                  <p className="text-sm text-gray-500">网络状态</p>
                  <p className="font-medium text-green-600">已上链</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-red-500">🛡️</span>
                <div>
                  <p className="text-sm text-gray-500">安全等级</p>
                  <p className="font-medium">高级加密</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-blue-500">🗄️</span>
                <div>
                  <p className="text-sm text-gray-500">IPFS CID</p>
                  <p className="font-mono text-sm break-all">{record.ipfsCid}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-orange-500">⛓️</span>
                <div>
                  <p className="text-sm text-gray-500">区块链交易ID</p>
                  <p className="font-mono text-sm break-all">{record.blockchainTxId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 快速操作 */}
          <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">快速操作</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowQRModal(true)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-blue-500">📱</span>
                <span>生成二维码</span>
              </button>

              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-green-500">📋</span>
                <span>复制链接</span>
              </button>

              <button
                onClick={() => navigate(`/records/${id}/history`)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-purple-500">🕰️</span>
                <span>查看历史</span>
              </button>
            </div>
          </div>

          {/* 访问历史 */}
          <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">最近访问</h3>
            <div className="space-y-3">
              {accessHistory.slice(0, 5).map(access => (
                <div
                  key={access.id}
                  className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{access.user}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(access.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{access.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 二维码模态框 */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-xl p-6 max-w-sm w-full mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold mb-4">记录二维码</h3>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />}
              <p className="text-sm text-gray-500 mb-4">扫描二维码快速访问此记录</p>
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享模态框 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-xl p-6 max-w-md w-full mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <h3 className="text-lg font-bold mb-4">分享记录</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">分享链接</label>
                <div className="flex">
                  <input
                    type="text"
                    value={`${window.location.origin}/records/${id}`}
                    readOnly
                    className={`flex-1 px-3 py-2 border rounded-l-lg ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
                  >
                    复制
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordDetail;
