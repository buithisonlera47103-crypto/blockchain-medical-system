/**
 * OWASP ZAP自动化安全测试
 * 使用OWASP ZAP进行自动化安全扫描
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from '../../src/utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface ZAPScanConfig {
  targetUrl: string;
  scanType: 'baseline' | 'full' | 'api';
  outputDir: string;
  timeout: number;
  excludeUrls?: string[];
  includeUrls?: string[];
  authScript?: string;
}

export interface ZAPScanResult {
  scanId: string;
  status: 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime: Date;
  reportPath: string;
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  alerts: ZAPAlert[];
}

export interface ZAPAlert {
  pluginid: string;
  alert: string;
  name: string;
  riskcode: string;
  confidence: string;
  riskdesc: string;
  desc: string;
  instances: ZAPInstance[];
  count: string;
  solution: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
}

export interface ZAPInstance {
  uri: string;
  method: string;
  param: string;
  attack: string;
  evidence: string;
}

export class OWASPZAPAutomation {
  private zapPath: string;
  private zapPort: number;

  constructor(zapPath: string = '/opt/zaproxy/zap.sh', zapPort: number = 8080) {
    this.zapPath = zapPath;
    this.zapPort = zapPort;
  }

  /**
   * 执行基线安全扫描
   */
  async runBaselineScan(config: ZAPScanConfig): Promise<ZAPScanResult> {
    const scanId = `baseline_${Date.now()}`;
    const startTime = new Date();

    logger.info('开始OWASP ZAP基线扫描', {
      scanId,
      targetUrl: config.targetUrl
    });

    try {
      // 确保输出目录存在
      await fs.mkdir(config.outputDir, { recursive: true });

      // 构建ZAP命令
      const zapArgs = [
        '-cmd',
        '-quickurl', config.targetUrl,
        '-quickout', path.join(config.outputDir, `${scanId}_report.html`),
        '-quickprogress'
      ];

      // 添加排除URL
      if (config.excludeUrls && config.excludeUrls.length > 0) {
        config.excludeUrls.forEach(url => {
          zapArgs.push('-exclude', url);
        });
      }

      // 执行ZAP扫描
      const result = await this.executeZAPScan(zapArgs, config.timeout);

      const endTime = new Date();

      // 解析扫描结果
      const reportPath = path.join(config.outputDir, `${scanId}_report.html`);
      const jsonReportPath = path.join(config.outputDir, `${scanId}_report.json`);

      // 生成JSON报告
      await this.generateJSONReport(config.targetUrl, jsonReportPath);

      // 解析结果
      const scanResult = await this.parseScanResults(jsonReportPath, scanId, startTime, endTime, reportPath);

      logger.info('OWASP ZAP基线扫描完成', {
        scanId,
        status: scanResult.status,
        duration: endTime.getTime() - startTime.getTime()
      });

      return scanResult;

    } catch (error: any) {
      logger.error('OWASP ZAP基线扫描失败', {
        scanId,
        error: error.message
      });

      return {
        scanId,
        status: 'failed',
        startTime,
        endTime: new Date(),
        reportPath: '',
        summary: { high: 0, medium: 0, low: 0, informational: 0 },
        alerts: []
      };
    }
  }

  /**
   * 执行完整安全扫描
   */
  async runFullScan(config: ZAPScanConfig): Promise<ZAPScanResult> {
    const scanId = `full_${Date.now()}`;
    const startTime = new Date();

    logger.info('开始OWASP ZAP完整扫描', {
      scanId,
      targetUrl: config.targetUrl
    });

    try {
      // 启动ZAP代理
      const zapProcess = await this.startZAPProxy();

      // 等待ZAP启动
      await this.waitForZAP();

      // 执行蜘蛛爬取
      await this.runSpider(config.targetUrl);

      // 执行主动扫描
      await this.runActiveScan(config.targetUrl);

      // 生成报告
      const reportPath = path.join(config.outputDir, `${scanId}_report.html`);
      const jsonReportPath = path.join(config.outputDir, `${scanId}_report.json`);

      await this.generateHTMLReport(reportPath);
      await this.generateJSONReport(config.targetUrl, jsonReportPath);

      // 停止ZAP
      await this.stopZAP();
      zapProcess?.kill();

      const endTime = new Date();

      // 解析结果
      const scanResult = await this.parseScanResults(jsonReportPath, scanId, startTime, endTime, reportPath);

      logger.info('OWASP ZAP完整扫描完成', {
        scanId,
        status: scanResult.status
      });

      return scanResult;

    } catch (error: any) {
      logger.error('OWASP ZAP完整扫描失败', {
        scanId,
        error: error.message
      });

      return {
        scanId,
        status: 'failed',
        startTime,
        endTime: new Date(),
        reportPath: '',
        summary: { high: 0, medium: 0, low: 0, informational: 0 },
        alerts: []
      };
    }
  }

  /**
   * 执行API安全扫描
   */
  async runAPIScan(config: ZAPScanConfig & { apiDefinition?: string }): Promise<ZAPScanResult> {
    const scanId = `api_${Date.now()}`;
    const startTime = new Date();

    logger.info('开始OWASP ZAP API扫描', {
      scanId,
      targetUrl: config.targetUrl
    });

    try {
      // 启动ZAP代理
      const zapProcess = await this.startZAPProxy();

      // 等待ZAP启动
      await this.waitForZAP();

      // 如果有API定义文件，导入它
      if (config.apiDefinition) {
        await this.importAPIDefinition(config.apiDefinition);
      }

      // 执行API扫描
      await this.runActiveScan(config.targetUrl);

      // 生成报告
      const reportPath = path.join(config.outputDir, `${scanId}_report.html`);
      const jsonReportPath = path.join(config.outputDir, `${scanId}_report.json`);

      await this.generateHTMLReport(reportPath);
      await this.generateJSONReport(config.targetUrl, jsonReportPath);

      // 停止ZAP
      await this.stopZAP();
      zapProcess?.kill();

      const endTime = new Date();

      // 解析结果
      const scanResult = await this.parseScanResults(jsonReportPath, scanId, startTime, endTime, reportPath);

      logger.info('OWASP ZAP API扫描完成', {
        scanId,
        status: scanResult.status
      });

      return scanResult;

    } catch (error: any) {
      logger.error('OWASP ZAP API扫描失败', {
        scanId,
        error: error.message
      });

      return {
        scanId,
        status: 'failed',
        startTime,
        endTime: new Date(),
        reportPath: '',
        summary: { high: 0, medium: 0, low: 0, informational: 0 },
        alerts: []
      };
    }
  }

  /**
   * 执行ZAP扫描命令
   */
  private async executeZAPScan(args: string[], timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const zapProcess = spawn(this.zapPath, args);

      const timer = setTimeout(() => {
        zapProcess.kill();
        reject(new Error('ZAP扫描超时'));
      }, timeout);

      zapProcess.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ZAP扫描失败，退出码: ${code}`));
        }
      });

      zapProcess.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * 启动ZAP代理
   */
  private async startZAPProxy(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const zapProcess = spawn(this.zapPath, [
        '-daemon',
        '-port', this.zapPort.toString(),
        '-config', 'api.disablekey=true'
      ]);

      zapProcess.on('error', reject);

      // 给ZAP一些时间启动
      setTimeout(() => {
        resolve(zapProcess);
      }, 5000);
    });
  }

  /**
   * 等待ZAP启动完成
   */
  private async waitForZAP(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${this.zapPort}/JSON/core/view/version/`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // ZAP还未启动
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('ZAP启动超时');
  }

  /**
   * 执行蜘蛛爬取
   */
  private async runSpider(targetUrl: string): Promise<void> {
    const response = await fetch(`http://localhost:${this.zapPort}/JSON/spider/action/scan/?url=${encodeURIComponent(targetUrl)}`);
    const result = await response.json();

    if (result.Result) {
      const scanId = result.scan;
      
      // 等待爬取完成
      while (true) {
        const statusResponse = await fetch(`http://localhost:${this.zapPort}/JSON/spider/view/status/?scanId=${scanId}`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.status === '100') {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * 执行主动扫描
   */
  private async runActiveScan(targetUrl: string): Promise<void> {
    const response = await fetch(`http://localhost:${this.zapPort}/JSON/ascan/action/scan/?url=${encodeURIComponent(targetUrl)}`);
    const result = await response.json();

    if (result.scan) {
      const scanId = result.scan;
      
      // 等待扫描完成
      while (true) {
        const statusResponse = await fetch(`http://localhost:${this.zapPort}/JSON/ascan/view/status/?scanId=${scanId}`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.status === '100') {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * 导入API定义
   */
  private async importAPIDefinition(apiDefinition: string): Promise<void> {
    // 实现API定义导入逻辑
    logger.info('导入API定义', { apiDefinition });
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(reportPath: string): Promise<void> {
    const response = await fetch(`http://localhost:${this.zapPort}/OTHER/core/other/htmlreport/`);
    const htmlContent = await response.text();
    await fs.writeFile(reportPath, htmlContent);
  }

  /**
   * 生成JSON报告
   */
  private async generateJSONReport(targetUrl: string, reportPath: string): Promise<void> {
    const response = await fetch(`http://localhost:${this.zapPort}/JSON/core/view/alerts/?baseurl=${encodeURIComponent(targetUrl)}`);
    const jsonContent = await response.text();
    await fs.writeFile(reportPath, jsonContent);
  }

  /**
   * 停止ZAP
   */
  private async stopZAP(): Promise<void> {
    try {
      await fetch(`http://localhost:${this.zapPort}/JSON/core/action/shutdown/`);
    } catch (error) {
      // ZAP可能已经停止
    }
  }

  /**
   * 解析扫描结果
   */
  private async parseScanResults(
    jsonReportPath: string,
    scanId: string,
    startTime: Date,
    endTime: Date,
    reportPath: string
  ): Promise<ZAPScanResult> {
    try {
      const jsonContent = await fs.readFile(jsonReportPath, 'utf-8');
      const zapData = JSON.parse(jsonContent);

      const alerts: ZAPAlert[] = zapData.alerts || [];
      
      const summary = {
        high: alerts.filter(a => a.riskcode === '3').length,
        medium: alerts.filter(a => a.riskcode === '2').length,
        low: alerts.filter(a => a.riskcode === '1').length,
        informational: alerts.filter(a => a.riskcode === '0').length
      };

      return {
        scanId,
        status: 'completed',
        startTime,
        endTime,
        reportPath,
        summary,
        alerts
      };

    } catch (error: any) {
      logger.error('解析ZAP扫描结果失败', { error: error.message });
      
      return {
        scanId,
        status: 'failed',
        startTime,
        endTime,
        reportPath,
        summary: { high: 0, medium: 0, low: 0, informational: 0 },
        alerts: []
      };
    }
  }
}

// 全局ZAP自动化实例
export const zapAutomation = new OWASPZAPAutomation();
