#!/usr/bin/env ts-node

/**
 * TLS Configuration Verification Script
 * Verifies TLS 1.3 configuration compliance with read111.md requirements
 */

import { TLSConfigService } from '../src/services/TLSConfigService';
import { logger } from '../src/utils/logger';

interface TLSVerificationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  message: string;
  details?: any;
}

class TLSVerifier {
  private tlsService: TLSConfigService;
  private results: TLSVerificationResult[] = [];

  constructor() {
    this.tlsService = TLSConfigService.getInstance();
  }

  async verify(): Promise<TLSVerificationResult[]> {
    console.log('🔒 Starting TLS 1.3 configuration verification...\n');

    await this.verifyTLSConfiguration();
    await this.verifySecurityHeaders();
    await this.verifyCipherSuites();
    await this.verifyHSTSConfiguration();
    await this.verifyCertificateConfiguration();

    return this.results;
  }

  private addResult(
    category: string,
    test: string,
    status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO',
    message: string,
    details?: any
  ): void {
    this.results.push({ category, test, status, message, details });

    const icon =
      status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARNING' ? '⚠️' : 'ℹ️';
    console.log(`${icon} ${category}: ${test} - ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  private async verifyTLSConfiguration(): Promise<void> {
    const config = this.tlsService.getConfig();

    // Check if TLS is enabled
    if (config.enabled) {
      this.addResult('TLS Configuration', 'TLS Enabled', 'PASS', 'TLS is enabled');
    } else {
      this.addResult(
        'TLS Configuration',
        'TLS Enabled',
        'WARNING',
        'TLS is disabled - not recommended for production'
      );
    }

    // Check TLS version compliance
    if (config.minVersion === 'TLSv1.3') {
      this.addResult(
        'TLS Configuration',
        'Minimum TLS Version',
        'PASS',
        `Minimum TLS version: ${config.minVersion}`
      );
    } else {
      this.addResult(
        'TLS Configuration',
        'Minimum TLS Version',
        'FAIL',
        `Minimum TLS version should be TLSv1.3, found: ${config.minVersion}`
      );
    }

    if (config.maxVersion === 'TLSv1.3') {
      this.addResult(
        'TLS Configuration',
        'Maximum TLS Version',
        'PASS',
        `Maximum TLS version: ${config.maxVersion}`
      );
    } else {
      this.addResult(
        'TLS Configuration',
        'Maximum TLS Version',
        'FAIL',
        `Maximum TLS version should be TLSv1.3, found: ${config.maxVersion}`
      );
    }

    // Check certificate paths
    this.addResult(
      'TLS Configuration',
      'Certificate Path',
      'INFO',
      `Certificate path: ${config.certificatePath}`
    );
    this.addResult(
      'TLS Configuration',
      'Private Key Path',
      'INFO',
      `Private key path: ${config.privateKeyPath}`
    );
  }

  private async verifySecurityHeaders(): Promise<void> {
    const headers = this.tlsService.getSecurityHeaders();

    // Check required security headers
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Content-Security-Policy',
    ];

    for (const headerName of requiredHeaders) {
      if (headers[headerName]) {
        this.addResult(
          'Security Headers',
          headerName,
          'PASS',
          `Header present: ${headers[headerName]}`
        );
      } else {
        this.addResult(
          'Security Headers',
          headerName,
          'FAIL',
          `Required security header missing: ${headerName}`
        );
      }
    }

    // Check HSTS header
    if (headers['Strict-Transport-Security']) {
      this.addResult(
        'Security Headers',
        'HSTS',
        'PASS',
        `HSTS header: ${headers['Strict-Transport-Security']}`
      );
    } else {
      this.addResult(
        'Security Headers',
        'HSTS',
        'WARNING',
        'HSTS header not present (may be disabled)'
      );
    }
  }

  private async verifyCipherSuites(): Promise<void> {
    const config = this.tlsService.getConfig();
    const approvedCiphers = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ];

    // Check if all approved ciphers are present
    for (const cipher of approvedCiphers) {
      if (config.ciphers.includes(cipher)) {
        this.addResult('Cipher Suites', cipher, 'PASS', 'Approved TLS 1.3 cipher suite present');
      } else {
        this.addResult('Cipher Suites', cipher, 'FAIL', 'Required TLS 1.3 cipher suite missing');
      }
    }

    // Check for non-TLS 1.3 ciphers
    const nonTLS13Ciphers = config.ciphers.filter(cipher => !cipher.startsWith('TLS_'));
    if (nonTLS13Ciphers.length === 0) {
      this.addResult(
        'Cipher Suites',
        'TLS 1.3 Only',
        'PASS',
        'Only TLS 1.3 cipher suites configured'
      );
    } else {
      this.addResult(
        'Cipher Suites',
        'TLS 1.3 Only',
        'FAIL',
        `Non-TLS 1.3 ciphers found: ${nonTLS13Ciphers.join(', ')}`
      );
    }

    this.addResult(
      'Cipher Suites',
      'Total Ciphers',
      'INFO',
      `Total cipher suites: ${config.ciphers.length}`,
      config.ciphers
    );
  }

  private async verifyHSTSConfiguration(): Promise<void> {
    const config = this.tlsService.getConfig();
    const hstsHeader = this.tlsService.getHSTSHeader();

    if (config.hsts.enabled) {
      this.addResult('HSTS Configuration', 'HSTS Enabled', 'PASS', 'HSTS is enabled');

      // Check max-age
      if (config.hsts.maxAge >= 31536000) {
        // 1 year
        this.addResult(
          'HSTS Configuration',
          'Max Age',
          'PASS',
          `HSTS max-age: ${config.hsts.maxAge} seconds`
        );
      } else {
        this.addResult(
          'HSTS Configuration',
          'Max Age',
          'WARNING',
          `HSTS max-age is less than 1 year: ${config.hsts.maxAge} seconds`
        );
      }

      // Check includeSubDomains
      if (config.hsts.includeSubDomains) {
        this.addResult(
          'HSTS Configuration',
          'Include Subdomains',
          'PASS',
          'HSTS includeSubDomains is enabled'
        );
      } else {
        this.addResult(
          'HSTS Configuration',
          'Include Subdomains',
          'WARNING',
          'HSTS includeSubDomains is disabled'
        );
      }

      // Check preload
      if (config.hsts.preload) {
        this.addResult('HSTS Configuration', 'Preload', 'PASS', 'HSTS preload is enabled');
      } else {
        this.addResult(
          'HSTS Configuration',
          'Preload',
          'INFO',
          'HSTS preload is disabled (optional)'
        );
      }

      this.addResult('HSTS Configuration', 'Header Value', 'INFO', `HSTS header: ${hstsHeader}`);
    } else {
      this.addResult('HSTS Configuration', 'HSTS Enabled', 'WARNING', 'HSTS is disabled');
    }
  }

  private async verifyCertificateConfiguration(): Promise<void> {
    const config = this.tlsService.getConfig();

    if (!config.enabled) {
      this.addResult(
        'Certificate Configuration',
        'TLS Status',
        'INFO',
        'TLS is disabled, skipping certificate verification'
      );
      return;
    }

    try {
      const validation = await this.tlsService.validateConfiguration();

      if (validation.valid) {
        this.addResult(
          'Certificate Configuration',
          'Configuration Valid',
          'PASS',
          'TLS configuration is valid'
        );
      } else {
        this.addResult(
          'Certificate Configuration',
          'Configuration Valid',
          'FAIL',
          `TLS configuration errors: ${validation.errors.join(', ')}`
        );
      }

      // Try to get certificate information
      try {
        const certInfo = await this.tlsService.getCertificateInfo();

        this.addResult(
          'Certificate Configuration',
          'Certificate Subject',
          'INFO',
          certInfo.subject
        );
        this.addResult('Certificate Configuration', 'Certificate Issuer', 'INFO', certInfo.issuer);
        this.addResult(
          'Certificate Configuration',
          'Valid From',
          'INFO',
          certInfo.validFrom.toISOString()
        );
        this.addResult(
          'Certificate Configuration',
          'Valid To',
          'INFO',
          certInfo.validTo.toISOString()
        );

        if (certInfo.isValid) {
          this.addResult(
            'Certificate Configuration',
            'Certificate Validity',
            'PASS',
            'Certificate is currently valid'
          );
        } else {
          this.addResult(
            'Certificate Configuration',
            'Certificate Validity',
            'FAIL',
            'Certificate is not valid'
          );
        }

        if (certInfo.daysUntilExpiry > 30) {
          this.addResult(
            'Certificate Configuration',
            'Certificate Expiry',
            'PASS',
            `Certificate expires in ${certInfo.daysUntilExpiry} days`
          );
        } else if (certInfo.daysUntilExpiry > 0) {
          this.addResult(
            'Certificate Configuration',
            'Certificate Expiry',
            'WARNING',
            `Certificate expires in ${certInfo.daysUntilExpiry} days`
          );
        } else {
          this.addResult(
            'Certificate Configuration',
            'Certificate Expiry',
            'FAIL',
            `Certificate expired ${Math.abs(certInfo.daysUntilExpiry)} days ago`
          );
        }
      } catch (certError) {
        this.addResult(
          'Certificate Configuration',
          'Certificate Analysis',
          'WARNING',
          `Could not analyze certificate: ${certError instanceof Error ? certError.message : String(certError)}`
        );
      }
    } catch (error) {
      this.addResult(
        'Certificate Configuration',
        'Configuration Validation',
        'FAIL',
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

async function main(): Promise<void> {
  try {
    const verifier = new TLSVerifier();
    const results = await verifier.verify();

    console.log('\n📊 TLS Verification Summary:');
    console.log('============================');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;
    const infoCount = results.filter(r => r.status === 'INFO').length;

    console.log(`✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`⚠️  WARNING: ${warningCount}`);
    console.log(`ℹ️  INFO: ${infoCount}`);
    console.log(`📋 TOTAL: ${results.length}`);

    if (failCount === 0) {
      console.log('\n🎉 TLS configuration verification PASSED!');
      if (warningCount > 0) {
        console.log('⚠️  Some warnings were found. Review them for potential improvements.');
      }
      console.log('✅ TLS 1.3 configuration is compliant with read111.md requirements');
    } else {
      console.log('\n❌ TLS configuration verification FAILED!');
      console.log('Please review the failed tests and fix the configuration.');
      process.exit(1);
    }

    // Show read111.md compliance status
    console.log('\n📋 read111.md Compliance Status:');
    console.log('=================================');

    const tlsService = TLSConfigService.getInstance();
    const config = tlsService.getConfig();

    console.log(
      `TLS 1.3 Enforcement: ${config.minVersion === 'TLSv1.3' && config.maxVersion === 'TLSv1.3' ? '✅' : '❌'}`
    );
    console.log(
      `Approved Cipher Suites: ${config.ciphers.every(c => c.startsWith('TLS_')) ? '✅' : '❌'}`
    );
    console.log(
      `Security Headers: ${Object.keys(tlsService.getSecurityHeaders()).length >= 5 ? '✅' : '❌'}`
    );
    console.log(`HSTS Configuration: ${config.hsts.enabled ? '✅' : '⚠️'}`);
  } catch (error) {
    console.error('❌ TLS verification failed:', error);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  main().catch(error => {
    console.error('TLS verification failed:', error);
    process.exit(1);
  });
}

export { TLSVerifier };
