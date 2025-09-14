import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useTheme } from '../contexts/ThemeContext';

// 预测结果接口
interface PredictionResult {
  predictionId: string;
  diseaseType: string;
  probability: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
  timestamp: string;
}

interface PredictionChartProps {
  predictions: PredictionResult[];
}

const PredictionChart: React.FC<PredictionChartProps> = ({ predictions }) => {
  const { theme } = useTheme();

  // 处理图表数据
  const chartData = predictions.map(prediction => ({
    disease: prediction.diseaseType,
    probability: Math.round(prediction.probability * 100),
    confidence: Math.round(prediction.confidence * 100),
    riskLevel: prediction.riskLevel,
  }));

  // 风险等级分布数据
  const riskDistribution = predictions.reduce(
    (acc, prediction) => {
      const risk = prediction.riskLevel;
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(riskDistribution).map(([level, count]) => ({
    name: level === 'HIGH' ? '高风险' : level === 'MEDIUM' ? '中风险' : '低风险',
    value: count,
    level,
  }));

  // 颜色配置
  const colors = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
  };

  // 主题样式
  const textColor = theme === 'dark' ? '#e5e7eb' : '#374151';
  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <p className="font-medium mb-2">{`疾病类型: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey === 'probability' ? '预测概率' : '置信度'}: ${entry.value}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 自定义饼图Tooltip
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <p className="font-medium">{`${data.name}: ${data.value} 个预测`}</p>
        </div>
      );
    }
    return null;
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无预测数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 预测概率和置信度柱状图 */}
      <div
        className={`p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <h4 className="text-lg font-semibold mb-4">疾病预测概率与置信度</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="disease"
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              label={{
                value: '百分比 (%)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: textColor },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: textColor }} />
            <Bar dataKey="probability" fill="#3b82f6" name="预测概率" radius={[2, 2, 0, 0]} />
            <Bar dataKey="confidence" fill="#10b981" name="置信度" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 风险等级分布饼图 */}
      {pieData.length > 0 && (
        <div
          className={`p-4 rounded-lg border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h4 className="text-lg font-semibold mb-4">风险等级分布</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name || 'Unknown'} ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.level as keyof typeof colors]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 预测结果摘要 */}
      <div
        className={`p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <h4 className="text-lg font-semibold mb-4">预测摘要</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{predictions.length}</div>
            <div className="text-sm opacity-75">总预测数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(
                (predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length) * 100
              )}
              %
            </div>
            <div className="text-sm opacity-75">平均概率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(
                (predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length) * 100
              )}
              %
            </div>
            <div className="text-sm opacity-75">平均置信度</div>
          </div>
        </div>
      </div>

      {/* 最新预测结果 */}
      <div
        className={`p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <h4 className="text-lg font-semibold mb-4">最新预测</h4>
        {predictions.slice(0, 3).map(prediction => (
          <div
            key={prediction.predictionId}
            className={`p-3 mb-3 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-medium">{prediction.diseaseType}</h5>
                <p className="text-sm opacity-75">
                  {new Date(prediction.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{Math.round(prediction.probability * 100)}%</div>
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    prediction.riskLevel === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : prediction.riskLevel === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {prediction.riskLevel === 'HIGH'
                    ? '高风险'
                    : prediction.riskLevel === 'MEDIUM'
                      ? '中风险'
                      : '低风险'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionChart;
