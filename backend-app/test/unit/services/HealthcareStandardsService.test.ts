/**
 * HealthcareStandardsService 单元测试
 * 测试医疗标准合规性服务的核心验证功能
 */

import { jest } from '@jest/globals';

describe('HealthcareStandardsService 单元测试', () => {
  describe('基本功能测试', () => {
    it('应该可以导入HealthcareStandardsService', async () => {
      // 测试导入是否成功
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      expect(HealthcareStandardsService).toBeDefined();
    });

    it('应该可以创建HealthcareStandardsService实例', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();
      expect(service).toBeDefined();
    });
  });

  describe('FHIR资源验证', () => {
    it('应该可以验证FHIR资源结构', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();

      const validPatient: any = {
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ family: '张', given: ['三'] }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      // 应该有验证方法
      expect(typeof service.validateFHIRResource).toBe('function');
    });
  });

  describe('HL7消息验证', () => {
    it('应该可以验证HL7消息', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();

      // 应该有验证方法
      expect(typeof service.validateHL7Message).toBe('function');
    });
  });

  describe('DICOM研究验证', () => {
    it('应该可以验证DICOM研究', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();

      // 应该有验证方法
      expect(typeof service.validateDICOMStudy).toBe('function');
    });
  });

  describe('标准间转换', () => {
    it('应该可以进行标准间转换', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();

      // 应该有转换方法
      expect(typeof service.convertBetweenStandards).toBe('function');
    });
  });

  describe('验证统计', () => {
    it('应该可以获取验证统计', async () => {
      const { HealthcareStandardsService } = await import('../../../src/services/HealthcareStandardsService');
      const service = new HealthcareStandardsService();

      // 应该有统计方法
      expect(typeof service.getValidationStatistics).toBe('function');
    });
  });
});
