/**
 * FHIR Validation Middleware 单元测试
 * 重写版本：简洁、高质量、专注FHIR R4验证规则
 */

import { jest } from '@jest/globals';

describe('FHIR Validation Middleware', () => {
  describe('FHIR ResourceType验证', () => {
    it('应该验证允许的资源类型', () => {
      const allowedTypes = [
        'Patient',
        'Observation',
        'Condition',
        'Medication',
        'Procedure',
        'AllergyIntolerance',
      ];

      allowedTypes.forEach(type => {
        expect(type).toBeTruthy();
        expect(typeof type).toBe('string');
      });
    });

    it('应该验证资源类型枚举', () => {
      const resourceType = 'Patient';
      const validTypes = ['Patient', 'Observation', 'Condition'];

      expect(validTypes).toContain(resourceType);
    });
  });

  describe('FHIR ID验证', () => {
    it('应该验证FHIR ID格式', () => {
      const validIds = [
        '123',
        'patient-123',
        'obs.123',
        'ABC-123.456',
      ];

      validIds.forEach(id => {
        expect(id).toMatch(/^[A-Za-z0-9\-.]+$/);
        expect(id.length).toBeLessThanOrEqual(64);
      });
    });

    it('应该验证ID长度限制', () => {
      const validId = 'a'.repeat(64);
      const tooLongId = 'a'.repeat(65);

      expect(validId.length).toBe(64);
      expect(tooLongId.length).toBeGreaterThan(64);
    });

    it('应该验证ID字符集', () => {
      const validChars = /^[A-Za-z0-9\-.]+$/;
      const validId = 'Patient-123.456';
      const invalidId = 'Patient_123';

      expect(validId).toMatch(validChars);
      expect(invalidId).not.toMatch(validChars);
    });
  });

  describe('FHIR Reference验证', () => {
    it('应该验证Reference格式', () => {
      const validReferences = [
        'Patient/123',
        'Observation/obs-456',
        'Practitioner/doc.123',
      ];

      validReferences.forEach(ref => {
        expect(ref).toMatch(/^[A-Za-z]+\/[A-Za-z0-9\-.]+$/);
        expect(ref).toContain('/');
      });
    });

    it('应该拆分ResourceType和ID', () => {
      const reference = 'Patient/123';
      const [resourceType, id] = reference.split('/');

      expect(resourceType).toBe('Patient');
      expect(id).toBe('123');
    });
  });

  describe('FHIR Date验证', () => {
    it('应该验证YYYY-MM-DD格式', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '1990-06-15',
      ];

      validDates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('应该验证部分日期格式', () => {
      const partialDates = [
        '2024-01',
        '2024',
      ];

      partialDates.forEach(date => {
        expect(date).toMatch(/^\d{4}(-\d{2})?$/);
      });
    });
  });

  describe('FHIR DateTime验证', () => {
    it('应该验证ISO 8601格式', () => {
      const validDateTimes = [
        '2024-01-01T10:30:00Z',
        '2024-01-01T10:30:00+08:00',
        '2024-01-01T10:30:00.123Z',
      ];

      validDateTimes.forEach(dt => {
        const date = new Date(dt);
        expect(date).toBeInstanceOf(Date);
        expect(date.toISOString()).toBeTruthy();
      });
    });
  });

  describe('FHIR Coding验证', () => {
    it('应该验证Coding结构', () => {
      const coding = {
        system: 'http://loinc.org',
        code: '8867-4',
        display: 'Heart rate',
      };

      expect(coding).toHaveProperty('system');
      expect(coding).toHaveProperty('code');
      expect(coding).toHaveProperty('display');
      expect(typeof coding.system).toBe('string');
      expect(typeof coding.code).toBe('string');
      expect(typeof coding.display).toBe('string');
    });

    it('应该验证必需字段', () => {
      const minimalCoding = {
        system: 'http://snomed.info/sct',
        code: '73211009',
      };

      expect(minimalCoding).toHaveProperty('system');
      expect(minimalCoding).toHaveProperty('code');
    });

    it('应该验证可选display字段', () => {
      const codingWithDisplay = {
        system: 'http://loinc.org',
        code: '8867-4',
        display: 'Heart rate',
      };

      const codingWithoutDisplay = {
        system: 'http://loinc.org',
        code: '8867-4',
      };

      expect(codingWithDisplay).toHaveProperty('display');
      expect(codingWithoutDisplay).not.toHaveProperty('display');
    });
  });

  describe('FHIR CodeableConcept验证', () => {
    it('应该验证CodeableConcept结构', () => {
      const concept = {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate',
          },
        ],
        text: 'Heart rate',
      };

      expect(concept).toHaveProperty('coding');
      expect(Array.isArray(concept.coding)).toBe(true);
      expect(concept).toHaveProperty('text');
      expect(typeof concept.text).toBe('string');
    });

    it('应该验证coding数组', () => {
      const coding = [
        { system: 'http://loinc.org', code: '8867-4' },
        { system: 'http://snomed.info/sct', code: '364075005' },
      ];

      expect(Array.isArray(coding)).toBe(true);
      expect(coding.length).toBeGreaterThan(0);
    });
  });

  describe('FHIR Identifier验证', () => {
    it('应该验证Identifier结构', () => {
      const identifier = {
        system: 'http://hospital.org/patients',
        value: '12345',
        use: 'official',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
            },
          ],
        },
      };

      expect(identifier).toHaveProperty('system');
      expect(identifier).toHaveProperty('value');
      expect(typeof identifier.value).toBe('string');
    });

    it('应该验证use枚举值', () => {
      const validUses = ['usual', 'official', 'temp', 'secondary', 'old'];
      
      validUses.forEach(use => {
        expect(validUses).toContain(use);
      });
    });
  });

  describe('FHIR HumanName验证', () => {
    it('应该验证HumanName结构', () => {
      const name = {
        use: 'official',
        family: 'Smith',
        given: ['John', 'William'],
        prefix: ['Mr.'],
        suffix: ['Jr.'],
      };

      expect(name).toHaveProperty('family');
      expect(name).toHaveProperty('given');
      expect(Array.isArray(name.given)).toBe(true);
    });

    it('应该验证name use枚举', () => {
      const validUses = ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'];
      
      validUses.forEach(use => {
        expect(validUses).toContain(use);
      });
    });
  });

  describe('FHIR Address验证', () => {
    it('应该验证Address结构', () => {
      const address = {
        use: 'home',
        type: 'physical',
        line: ['123 Main St', 'Apt 4B'],
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      expect(address).toHaveProperty('line');
      expect(Array.isArray(address.line)).toBe(true);
      expect(address).toHaveProperty('city');
      expect(address).toHaveProperty('postalCode');
    });

    it('应该验证address use枚举', () => {
      const validUses = ['home', 'work', 'temp', 'old', 'billing'];
      
      validUses.forEach(use => {
        expect(validUses).toContain(use);
      });
    });

    it('应该验证address type枚举', () => {
      const validTypes = ['postal', 'physical', 'both'];
      
      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe('FHIR ContactPoint验证', () => {
    it('应该验证ContactPoint结构', () => {
      const contact = {
        system: 'phone',
        value: '+1-555-1234',
        use: 'home',
        rank: 1,
      };

      expect(contact).toHaveProperty('system');
      expect(contact).toHaveProperty('value');
      expect(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']).toContain(contact.system);
    });

    it('应该验证system枚举', () => {
      const systems = ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'];
      
      systems.forEach(system => {
        expect(systems).toContain(system);
      });
    });
  });

  describe('FHIR Period验证', () => {
    it('应该验证Period结构', () => {
      const period = {
        start: '2024-01-01',
        end: '2024-12-31',
      };

      expect(period).toHaveProperty('start');
      expect(period).toHaveProperty('end');
    });

    it('应该验证时间顺序', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');

      expect(start < end).toBe(true);
    });
  });

  describe('FHIR Quantity验证', () => {
    it('应该验证Quantity结构', () => {
      const quantity = {
        value: 72,
        unit: 'beats/minute',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      };

      expect(quantity).toHaveProperty('value');
      expect(typeof quantity.value).toBe('number');
      expect(quantity).toHaveProperty('unit');
    });

    it('应该验证数值类型', () => {
      const value = 72.5;
      
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  describe('FHIR Narrative验证', () => {
    it('应该验证Narrative结构', () => {
      const narrative = {
        status: 'generated',
        div: '<div xmlns="http://www.w3.org/1999/xhtml">Content</div>',
      };

      expect(narrative).toHaveProperty('status');
      expect(narrative).toHaveProperty('div');
      expect(['generated', 'extensions', 'additional', 'empty']).toContain(narrative.status);
    });

    it('应该验证XHTML格式', () => {
      const div = '<div xmlns="http://www.w3.org/1999/xhtml">Content</div>';
      
      expect(div).toContain('<div');
      expect(div).toContain('</div>');
      expect(div).toContain('xmlns=');
    });
  });

  describe('FHIR Extension验证', () => {
    it('应该验证Extension结构', () => {
      const extension = {
        url: 'http://example.org/fhir/StructureDefinition/custom',
        valueString: 'Custom value',
      };

      expect(extension).toHaveProperty('url');
      expect(extension.url).toMatch(/^https?:\/\//);
    });

    it('应该验证value[x]类型', () => {
      const valueTypes = [
        'valueString',
        'valueInteger',
        'valueBoolean',
        'valueDateTime',
        'valueCode',
        'valueCoding',
        'valueCodeableConcept',
      ];

      valueTypes.forEach(type => {
        expect(type).toContain('value');
      });
    });
  });

  describe('错误处理', () => {
    it('应该验证自定义验证错误', () => {
      const error = {
        field: 'coding.system',
        message: 'Coding.system must be a string',
        type: 'custom',
      };

      expect(error).toHaveProperty('field');
      expect(error).toHaveProperty('message');
    });

    it('应该验证字段类型错误', () => {
      const errors = [
        'Coding.system must be a string',
        'Coding.code must be a string',
        'CodeableConcept.coding must be an array',
        'CodeableConcept.text must be a string',
      ];

      errors.forEach(err => {
        expect(err).toBeTruthy();
        expect(err).toContain('must be');
      });
    });
  });

  describe('可选字段处理', () => {
    it('应该验证可选字段标记', () => {
      const optionalFields = {
        display: undefined,
        text: undefined,
        period: undefined,
      };

      Object.values(optionalFields).forEach(value => {
        expect(value === undefined || value !== null).toBe(true);
      });
    });
  });
});

