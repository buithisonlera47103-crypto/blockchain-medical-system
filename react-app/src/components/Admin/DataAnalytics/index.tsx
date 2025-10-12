/**
 * 数据分析页面
 * MedChain Admin Panel - Data Analytics
 */

import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

export const DataAnalytics: React.FC = () => {
  const patientDistributionOption = {
    title: { text: '患者性别分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      name: '患者分布',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1256, name: '男性患者' },
        { value: 1523, name: '女性患者' },
      ],
    }],
  };

  return (
    <div className="data-analytics admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <BarChartOutlined /> 数据分析
        </h1>
        <p className="admin-page-description">
          医疗数据统计和趋势分析
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="总患者数" value={2779} prefix="👥" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="今日诊疗" value={156} prefix="🏥" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="病历总数" value={15678} prefix="📋" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="平均治愈率" value={89.2} suffix="%" prefix="✅" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <ReactECharts option={patientDistributionOption} style={{ height: 400 }} />
      </Card>
    </div>
  );
};

export default DataAnalytics;

