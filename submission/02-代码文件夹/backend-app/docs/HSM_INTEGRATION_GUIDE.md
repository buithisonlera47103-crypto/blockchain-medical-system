# HSM Integration Guide

## Overview

This guide explains how to integrate Hardware Security Modules (HSM) with the
blockchain EMR system for production-grade key management and encryption
operations.

## Supported HSM Providers

### 1. Mock HSM (Development/Testing)

- **Use Case**: Development and testing environments
- **Configuration**: No external dependencies
- **Security Level**: Development only - not for production

### 2. AWS CloudHSM

- **Use Case**: Production deployments on AWS
- **Configuration**: Requires AWS credentials and CloudHSM cluster
- **Security Level**: FIPS 140-2 Level 3 validated

### 3. Azure Key Vault

- **Use Case**: Production deployments on Azure
- **Configuration**: Requires Azure credentials and Key Vault instance
- **Security Level**: FIPS 140-2 Level 2 validated

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# HSM Configuration
USE_HSM=true
HSM_PROVIDER=aws-cloudhsm  # Options: mock, aws-cloudhsm, azure-keyvault

# AWS CloudHSM Configuration
HSM_REGION=us-east-1
HSM_ACCESS_KEY_ID=your_aws_access_key
HSM_SECRET_ACCESS_KEY=your_aws_secret_key

# Azure Key Vault Configuration
HSM_TENANT_ID=your_azure_tenant_id
HSM_CLIENT_ID=your_azure_client_id
HSM_CLIENT_SECRET=your_azure_client_secret
HSM_ENDPOINT=https://your-keyvault.vault.azure.net/
```

### Development Setup (Mock HSM)

For development and testing, use the mock HSM provider:

```bash
USE_HSM=true
HSM_PROVIDER=mock
```

This provides the same interface as production HSMs but stores keys in memory.

## AWS CloudHSM Setup

### Prerequisites

1. **AWS CloudHSM Cluster**: Create and initialize a CloudHSM cluster
2. **IAM Permissions**: Configure IAM user with CloudHSM permissions
3. **Network Access**: Ensure your application can reach the CloudHSM cluster

### Step 1: Create CloudHSM Cluster

```bash
# Create CloudHSM cluster
aws cloudhsmv2 create-cluster \
    --hsm-type hsm1.medium \
    --subnet-ids subnet-12345678 subnet-87654321

# Initialize cluster (after HSM is created)
aws cloudhsmv2 initialize-cluster \
    --cluster-id cluster-12345678 \
    --signed-cert file://customerCA.crt \
    --trust-anchor file://customerCA.crt
```

### Step 2: Configure IAM Permissions

Create an IAM policy with CloudHSM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudhsm:DescribeClusters",
        "cloudhsm:DescribeBackups",
        "cloudhsm:CreateHsm",
        "cloudhsm:DeleteHsm"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 3: Configure Application

```bash
USE_HSM=true
HSM_PROVIDER=aws-cloudhsm
HSM_REGION=us-east-1
HSM_ACCESS_KEY_ID=AKIA...
HSM_SECRET_ACCESS_KEY=...
```

## Azure Key Vault Setup

### Prerequisites

1. **Azure Key Vault**: Create a Key Vault instance
2. **Service Principal**: Create service principal with Key Vault permissions
3. **Network Access**: Configure network access to Key Vault

### Step 1: Create Key Vault

```bash
# Create resource group
az group create --name emr-hsm-rg --location eastus

# Create Key Vault
az keyvault create \
    --name emr-production-kv \
    --resource-group emr-hsm-rg \
    --location eastus \
    --sku premium
```

### Step 2: Create Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
    --name emr-hsm-sp \
    --role "Key Vault Crypto Officer" \
    --scopes /subscriptions/{subscription-id}/resourceGroups/emr-hsm-rg
```

### Step 3: Configure Application

```bash
USE_HSM=true
HSM_PROVIDER=azure-keyvault
HSM_TENANT_ID=your-tenant-id
HSM_CLIENT_ID=your-client-id
HSM_CLIENT_SECRET=your-client-secret
HSM_ENDPOINT=https://emr-production-kv.vault.azure.net/
```

## Migration from File-Based Storage

### Automatic Migration

The system supports automatic migration from file-based key storage to HSM:

1. **Backup existing keys**: Ensure all file-based keys are backed up
2. **Enable HSM**: Set `USE_HSM=true` in environment
3. **Start application**: The system will continue using existing keys while new
   keys use HSM

### Manual Migration

For complete migration to HSM:

```bash
# Run migration script
npm run migrate:keys-to-hsm
```

This script will:

1. Read all existing file-based keys
2. Import them into the HSM
3. Update key metadata
4. Verify migration success

## Security Considerations

### Key Rotation

HSM keys should be rotated regularly:

```typescript
// Rotate key programmatically
const cryptoService = CryptographyService.getInstance();
await cryptoService.rotateKey(keyId);
```

### Access Control

- **Principle of Least Privilege**: Grant minimal required permissions
- **Audit Logging**: Enable comprehensive audit logging
- **Network Security**: Use VPC/VNet isolation for HSM access

### Backup and Recovery

- **HSM Backup**: Configure automatic HSM backups
- **Key Metadata**: Backup key metadata separately
- **Disaster Recovery**: Test recovery procedures regularly

## Monitoring and Alerting

### Health Checks

The HSM service provides health check endpoints:

```typescript
const isHealthy = await hsmService.isHealthy();
```

### Metrics

Monitor these key metrics:

- HSM availability
- Key operation latency
- Key rotation frequency
- Failed operations

### Alerts

Configure alerts for:

- HSM service unavailability
- Key operation failures
- Unusual key access patterns
- Key expiration warnings

## Troubleshooting

### Common Issues

1. **HSM Unavailable**
   - Check network connectivity
   - Verify HSM cluster status
   - Check authentication credentials

2. **Key Not Found**
   - Verify key ID format
   - Check key metadata store
   - Ensure key hasn't expired

3. **Permission Denied**
   - Verify IAM/RBAC permissions
   - Check service principal configuration
   - Review HSM access policies

### Debug Mode

Enable debug logging for HSM operations:

```bash
LOG_LEVEL=debug
HSM_DEBUG=true
```

## Performance Considerations

### Latency

HSM operations have higher latency than local operations:

- **Key Generation**: 100-500ms
- **Encryption**: 10-50ms
- **Decryption**: 10-50ms

### Throughput

Plan for HSM throughput limits:

- **AWS CloudHSM**: ~10,000 operations/second
- **Azure Key Vault**: ~2,000 operations/second

### Caching

Implement appropriate caching strategies:

- Cache frequently used keys (with security considerations)
- Use connection pooling for HSM connections
- Implement circuit breakers for resilience

## Testing

### Unit Tests

Run HSM unit tests:

```bash
npm test -- HSMService.test.ts
```

### Integration Tests

Test with actual HSM providers:

```bash
# Test with AWS CloudHSM
HSM_PROVIDER=aws-cloudhsm npm run test:integration

# Test with Azure Key Vault
HSM_PROVIDER=azure-keyvault npm run test:integration
```

### Load Testing

Perform load testing to verify performance:

```bash
npm run test:load:hsm
```

## Compliance

### FIPS 140-2

Both AWS CloudHSM and Azure Key Vault provide FIPS 140-2 validated HSMs:

- **AWS CloudHSM**: Level 3 validation
- **Azure Key Vault**: Level 2 validation

### Audit Requirements

HSM integration supports audit requirements:

- All key operations are logged
- Audit trails are tamper-evident
- Compliance reports can be generated

## Support

For HSM integration support:

1. Check the troubleshooting section
2. Review HSM provider documentation
3. Contact the development team
4. Escalate to HSM provider support if needed
