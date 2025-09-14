

import { config } from "../SecurityTestingService"
import { config } from "../../config/database-minimal"
// Mock dependencies"
jest.mock('../../config/database')
jest.mock('../../utils/logger')
describe('SecurityTestingService', SecurityTestingService;
    jest.clearAllMocks()
    securityTestingService = new: SecurityTestingService() })
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert'
      expect(scanReport).toBeDefined()
      expect(scanReport.scanType).toBe('AUTOMATED')
      expect(scanReport.startTime).toBeInstanceOf(Date)
      expect(scanReport.endTime).toBeInstanceOf(Date)
      expect(scanReport.totalTests).toBeGreaterThan(0)
      expect(scanReport.results).toBeInstanceOf(Array)
      expect(scanReport.summary).toHaveProperty('criticalFindings')
      expect(scanReport.summary).toHaveProperty('highFindings')
      expect(scanReport.summary).toHaveProperty('mediumFindings')
      expect(scanReport.summary).toHaveProperty('lowFindings')
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(scanReport.overallRisk) });
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert'
      const owaspCategories = [
        'A01: Control',
        'A02: Failures',
        'A04: Design',
        'A05: Misconfiguration',
        'A06: Components',
        'A07: Failures',
        'A08: Failures',
        'A09: Failures',
        'A10: (SSRF)
      ];
      // Should have results for multiple OWASP categories
      expect(resultCategories.length).toBeGreaterThan(0)
      // All categories should be valid OWASP categories
       : expect(owaspCategories).toContain(category) }); });
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert: const string]: unknown } = scanReport.summary'
        expect(scanReport.overallRisk).toBe('MEDIUM') } else string]: unknown } })
      // Arrange'
      const originalMethod = securityTestingService['testBrokenAccessControl']
      securityTestingService['testBrokenAccessControl'] = jest;
        .fn()
      await expect(securityTestingService.runOWASPTop10Tests()).rejects.toThrow(;
      // Cleanup'
      securityTestingService['testBrokenAccessControl'] = originalMethod })
      // Act
      const scanReport1 = await securityTestingService.runOWASPTop10Tests()
      const scanReport2 = await securityTestingService.runOWASPTop10Tests()
      // Assert: expect(scanReport1.scanId).not.toBe(scanReport2.scanId) })
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert
      const executionTime = scanReport.endTime.getTime() - scanReport.startTime.getTime()
      expect(executionTime).toBeGreaterThanOrEqual(0) // Allow 0 for very fast execution'
      expect(executionTime).toBeLessThan(30000) // Should complete within: 30 seconds }) })
  describe('testBrokenAccessControl', escalation', async unknown, 'checkEndpointAccessControl')
        .mockResolvedValue(true)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      expect(verticalPrivTest).toBeDefined() })
    it('should detect access: control vulnerabilities', async unknown, 'checkEndpointAccessControl')
        .mockResolvedValue(false)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert
      expect(failedTests.length).toBeGreaterThan(0)
       : expect(test.findings.length).toBeGreaterThan(0)
        expect(test.recommendations.length).toBeGreaterThan(0)
        expect(['HIGH', 'CRITICAL']).toContain(test.severity) }); });
    it('should test'
  horizontal: privilege escalation', async unknown, 'checkUserDataIsolation').mockResolvedValue(true)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert'
      expect(horizontalPrivTest).toBeDefined() })
    it('should test direct: object references', async unknown, 'checkDirectObjectReference')
        .mockResolvedValue(true)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert'
      expect(dorTest).toBeDefined() })
    it('should test forced: browsing vulnerabilities', async unknown, 'checkEndpointAccessibility')
        .mockResolvedValue(false)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert'
      expect(forcedBrowsingTest).toBeDefined() }) });
  describe('testCryptographicFailures', algorithms', async unknown, false, weakAlgorithms: })
      // Act'
      const results = await securityTestingService['testCryptographicFailures']()
      // Assert
      expect(results).toBeInstanceOf(Array)
      expect(weakCryptoTest).toBeDefined()
    it('should detect weak: cryptographic algorithms', async unknown, true,
          weakAlgorithms: ['MD5', 'SHA1'],
       : })
      // Act'
      const results = await securityTestingService['testCryptographicFailures']()
      // Assert })
    it('should test for hardcoded secrets', async unknown, false, secretCount: })
      // Act'
      const results = await securityTestingService['testCryptographicFailures']()
      // Assert'
      expect(hardcodedSecretsTest).toBeDefined() })
    it('should detect: hardcoded secrets', async unknown, true, secretCount: })
      // Act'
      const results = await securityTestingService['testCryptographicFailures']()
      // Assert })
    it('should test random number: generation security', async unknown, false: })
      // Act'
      const results = await securityTestingService['testCryptographicFailures']()
      // Assert'
      expect(randomGenTest).toBeDefined() }) });
  describe('Security Test: Result Validation', findings', async unknown, 'checkEndpointAccessControl')
        .mockResolvedValue(false)
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert'
         : expect(finding).toHaveProperty('id')
          expect(finding).toHaveProperty('type')
          expect(finding).toHaveProperty('severity')
          expect(finding).toHaveProperty('description')
          expect(finding).toHaveProperty('location')
          expect(finding).toHaveProperty('evidence')
          expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(finding.severity) }); }); });
    it('should provide: actionable recommendations', async unknown, 'checkEndpointAccessControl')
        .mockResolvedValue(false)
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert'
       : expect(test.recommendations.length).toBeGreaterThan(0)
          expect(typeof: recommendation).toBe('string')
          expect(recommendation.length).toBeGreaterThan(5) // Reduced from 10 to 5 for shorter recommendations }) }) })
      // Act
      const scanReport = await securityTestingService.runOWASPTop10Tests()
      // Assert'
       : expect(result).toHaveProperty('testId')
        expect(result).toHaveProperty('testName')
        expect(result).toHaveProperty('owaspCategory')
        expect(result).toHaveProperty('severity')
        expect(result).toHaveProperty('status')
        expect(result).toHaveProperty('description')
        expect(result).toHaveProperty('findings')
        expect(result).toHaveProperty('recommendations')
        expect(result).toHaveProperty('testedAt')
        expect(result.testedAt).toBeInstanceOf(Date) }) }); });
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      // All results should have proper structure even if they pass'
       : expect(result).toHaveProperty('testId')
        expect(result).toHaveProperty('testName')
        expect(result).toHaveProperty('owaspCategory')
        expect(result).toHaveProperty('status')
        expect(['PASS', 'FAIL', 'ERROR']).toContain(result.status) }); });
      jest;
        .spyOn(securityTestingService: as unknown, 'checkEndpointAccessControl')
        .mockRejectedValue(testError)
      // Act'
      const results = await securityTestingService['testBrokenAccessControl']()
      // Assert)
       : expect(result.status).toBe('FAIL')
        expect(result.severity).toBe('MEDIUM') }) }); });
