# EMR Blockchain Secrets Directory

This directory contains sensitive cryptographic secrets for the EMR blockchain application.

## Security Guidelines

1. **Never commit these files to version control**
2. **Restrict access to this directory** (chmod 700)
3. **Restrict access to secret files** (chmod 600)
4. **Use proper secrets management in production**
5. **Rotate secrets regularly**
6. **Monitor access to these files**

## Files Description

- `mysql_root_password.txt` - MySQL root password
- `mysql_password.txt` - MySQL application user password
- `redis_password.txt` - Redis authentication password
- `jwt_secret.txt` - JWT signing secret
- `jwt_refresh_secret.txt` - JWT refresh token secret
- `encryption_key.txt` - Application encryption key
- `session_secret.txt` - Session encryption secret

## Production Deployment

For production environments, consider using:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- Kubernetes Secrets

## Emergency Procedures

If secrets are compromised:
1. Immediately rotate all affected secrets
2. Invalidate all existing sessions/tokens
3. Audit access logs
4. Update all dependent systems

Generated on: Sun Sep 14 09:44:44 CST 2025
