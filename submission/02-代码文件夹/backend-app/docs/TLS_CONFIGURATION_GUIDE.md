# TLS 1.3 Configuration Guide

## Overview

This guide explains how to configure TLS 1.3 for the blockchain EMR system to
meet read111.md security requirements. The system enforces TLS 1.3 with approved
cipher suites and comprehensive security headers.

## TLS 1.3 Requirements (read111.md Compliant)

### Security Standards

- **TLS Version**: TLS 1.3 minimum and maximum
- **Cipher Suites**: Only approved TLS 1.3 cipher suites
- **Certificate Management**: Automated certificate handling
- **Security Headers**: HSTS, CSP, and other security headers
- **Perfect Forward Secrecy**: DH parameters for enhanced security

### Approved Cipher Suites

The system uses only these TLS 1.3 approved cipher suites:

- `TLS_AES_256_GCM_SHA384`
- `TLS_CHACHA20_POLY1305_SHA256`
- `TLS_AES_128_GCM_SHA256`

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# TLS 1.3 Configuration (read111.md compliant)
TLS_ENABLED=true
TLS_MIN_VERSION=TLSv1.3
TLS_MAX_VERSION=TLSv1.3
TLS_CERT_PATH=/etc/ssl/certs/server.crt
TLS_KEY_PATH=/etc/ssl/private/server.key
TLS_CA_PATH=/etc/ssl/certs/ca.crt
TLS_DH_PARAM_PATH=/etc/ssl/certs/dhparam.pem
TLS_ENABLE_OCSP=true
TLS_ENABLE_SCT=true

# HSTS Configuration
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=false

# Server Ports
PORT=3001
HTTPS_PORT=3443
```

### Development Setup

#### 1. Generate Self-Signed Certificates

For development environments, generate self-signed certificates:

```bash
# Generate certificates with default settings
npm run tls:generate-certs

# Generate with custom domain
DOMAIN=emr.local npm run tls:generate-certs

# Generate with custom organization
ORGANIZATION="My EMR System" npm run tls:generate-certs
```

#### 2. Update Environment Configuration

After generating certificates, update your `.env` file:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key
TLS_DH_PARAM_PATH=./certs/dhparam.pem
```

#### 3. Start the Server

```bash
npm run dev
```

The server will start with HTTPS on port 3443 (or your configured HTTPS_PORT).

### Production Setup

#### 1. Obtain Production Certificates

For production, use certificates from a trusted Certificate Authority:

**Option A: Let's Encrypt (Recommended)**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be in /etc/letsencrypt/live/your-domain.com/
```

**Option B: Commercial CA**

- Purchase SSL certificate from a trusted CA
- Follow CA-specific instructions for certificate generation

#### 2. Configure Production Environment

```bash
# Production TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
TLS_CA_PATH=/etc/letsencrypt/live/your-domain.com/chain.pem

# Generate DH parameters
openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
TLS_DH_PARAM_PATH=/etc/ssl/certs/dhparam.pem

# Production HSTS
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true
```

#### 3. Set Proper Permissions

```bash
# Certificate files should be readable by the application
sudo chown root:ssl-cert /etc/letsencrypt/live/your-domain.com/*
sudo chmod 640 /etc/letsencrypt/live/your-domain.com/privkey.pem

# Add application user to ssl-cert group
sudo usermod -a -G ssl-cert your-app-user
```

## Certificate Management

### Automatic Certificate Renewal

#### Let's Encrypt Renewal

```bash
# Add to crontab for automatic renewal
0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload your-app"
```

#### Certificate Monitoring

The system automatically monitors certificate expiration:

```bash
# Check certificate status
npm run tls:validate

# Test TLS configuration
npm run tls:test
```

### Certificate Validation

The TLS service automatically validates:

- Certificate file existence
- Private key file existence
- Certificate and key matching
- Certificate validity period
- Certificate expiration warnings (30 days)

## Security Features

### Security Headers

The system automatically applies these security headers:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### TLS 1.3 Enforcement

The system enforces TLS 1.3 by:

- Setting minimum and maximum TLS version to 1.3
- Using only approved TLS 1.3 cipher suites
- Disabling older TLS versions (1.0, 1.1, 1.2)
- Enabling perfect forward secrecy

## Testing

### TLS Configuration Testing

```bash
# Run TLS unit tests
npm run tls:test

# Validate current TLS configuration
npm run tls:validate

# Test TLS connection
openssl s_client -connect localhost:3443 -tls1_3
```

### Security Testing

```bash
# Test TLS version enforcement
nmap --script ssl-enum-ciphers -p 3443 localhost

# Test security headers
curl -I https://localhost:3443/api/v1/health

# Test HSTS
curl -I https://localhost:3443/api/v1/health | grep -i strict-transport
```

## Troubleshooting

### Common Issues

#### 1. Certificate Not Found

```
Error: Certificate file not found: /path/to/cert.pem
```

**Solution:**

- Verify certificate path in environment variables
- Check file permissions
- Ensure certificate files exist

#### 2. Private Key Mismatch

```
Error: Certificate and private key do not match
```

**Solution:**

- Verify certificate and key were generated together
- Check for file corruption
- Regenerate certificate and key pair

#### 3. TLS Handshake Failure

```
Error: TLS handshake failed
```

**Solution:**

- Verify TLS 1.3 support on client
- Check cipher suite compatibility
- Validate certificate chain

#### 4. Permission Denied

```
Error: EACCES: permission denied, open '/etc/ssl/private/server.key'
```

**Solution:**

- Check file permissions: `ls -la /etc/ssl/private/server.key`
- Add application user to ssl-cert group
- Set proper file ownership

### Debug Mode

Enable debug logging for TLS issues:

```bash
# Enable TLS debug logging
DEBUG=tls* npm run dev

# Enable OpenSSL debug
export OPENSSL_CONF=/path/to/debug.conf
```

### Health Checks

The system provides TLS health check endpoints:

```bash
# Check TLS status
curl -k https://localhost:3443/api/v1/health

# Check certificate information
curl -k https://localhost:3443/api/v1/tls/certificate-info
```

## Performance Considerations

### TLS 1.3 Performance Benefits

TLS 1.3 provides better performance than older versions:

- **Reduced Handshake**: 1-RTT handshake vs 2-RTT in TLS 1.2
- **0-RTT Resumption**: For returning clients
- **Improved Cipher Suites**: More efficient algorithms

### Optimization Tips

1. **Enable HTTP/2**: Works well with TLS 1.3
2. **Use Session Resumption**: Reduces handshake overhead
3. **Optimize Certificate Chain**: Minimize certificate chain length
4. **Enable OCSP Stapling**: Reduces certificate validation overhead

## Compliance

### read111.md Compliance Checklist

- ✅ **TLS 1.3 Enforcement**: Minimum and maximum version set to TLS 1.3
- ✅ **Approved Cipher Suites**: Only TLS 1.3 approved ciphers
- ✅ **Certificate Management**: Automated certificate handling
- ✅ **Security Headers**: HSTS and comprehensive security headers
- ✅ **Perfect Forward Secrecy**: DH parameters configured
- ✅ **Certificate Validation**: Automated certificate monitoring

### Security Audit

Regular security audits should verify:

- TLS configuration compliance
- Certificate validity and expiration
- Security header implementation
- Cipher suite restrictions
- Protocol version enforcement

## Migration from HTTP

### Gradual Migration

1. **Phase 1**: Enable HTTPS alongside HTTP
2. **Phase 2**: Redirect HTTP to HTTPS
3. **Phase 3**: Disable HTTP completely

### Client Updates

Update client applications to use HTTPS:

```javascript
// Frontend API client update
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:3443';
```

### Load Balancer Configuration

If using a load balancer, configure TLS termination:

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    ssl_protocols TLSv1.3;
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256;
    ssl_prefer_server_ciphers off;
}
```

## Support

For TLS configuration support:

1. Check this documentation
2. Run validation: `npm run tls:validate`
3. Check logs for specific error messages
4. Contact development team with configuration details
