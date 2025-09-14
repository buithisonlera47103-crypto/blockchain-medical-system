# EMR Blockchain System - Incident Response Procedures

## Overview

This document provides comprehensive incident response procedures for the EMR
blockchain system. It covers detection, assessment, response, and recovery
procedures for various types of incidents affecting system availability,
security, and compliance.

## Incident Classification

### Severity Levels

#### P0 - Critical (Response Time: Immediate)

- Complete system outage
- Security breach with data exposure
- HIPAA compliance violation
- Data corruption or loss

#### P1 - High (Response Time: 15 minutes)

- Partial system outage affecting critical functions
- Performance degradation >50%
- Failed authentication systems
- Blockchain consensus failure

#### P2 - Medium (Response Time: 1 hour)

- Non-critical service degradation
- Performance issues <50%
- Minor security incidents
- Backup failures

#### P3 - Low (Response Time: 4 hours)

- Cosmetic issues
- Non-critical monitoring alerts
- Documentation updates needed

## Incident Response Team

### Primary Contacts

- **Incident Commander**: ops-lead@emr.com (24/7)
- **Security Lead**: security-lead@emr.com (24/7)
- **Compliance Officer**: compliance@emr.com (Business hours)
- **Technical Lead**: tech-lead@emr.com (24/7)

### Escalation Matrix

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead + Incident commander
3. **Level 3**: Department head + Security lead
4. **Level 4**: CTO + Legal team

## General Incident Response Process

### 1. Detection and Alert

- Monitor alerts from Prometheus/Grafana
- Review logs in Kibana/Elasticsearch
- Check system health dashboards
- Validate incident through multiple sources

### 2. Initial Assessment (5 minutes)

- Determine incident severity
- Identify affected systems and users
- Estimate business impact
- Activate appropriate response team

### 3. Communication

- Create incident ticket in JIRA
- Notify stakeholders via Slack (#incidents)
- Update status page if customer-facing
- Document all actions in incident log

### 4. Investigation and Mitigation

- Follow specific runbook procedures
- Implement immediate workarounds
- Collect diagnostic information
- Coordinate with relevant teams

### 5. Resolution and Recovery

- Implement permanent fix
- Verify system functionality
- Monitor for recurrence
- Update documentation

### 6. Post-Incident Review

- Conduct blameless post-mortem
- Identify root causes
- Create action items for prevention
- Update runbooks and procedures

## Specific Incident Procedures

### System Outage (P0)

#### EMR Backend System Down

**Alert**: `EMRSystemDown` **Impact**: Complete service unavailability

**Immediate Actions (0-5 minutes):**

1. Verify alert accuracy:

   ```bash
   curl -f https://localhost:3001/api/v1/health
   kubectl get pods -n emr-production
   ```

2. Check system resources:

   ```bash
   top
   df -h
   free -m
   ```

3. Review recent deployments:
   ```bash
   kubectl rollout history deployment/emr-backend -n emr-production
   ```

**Investigation Steps (5-15 minutes):**

1. Check application logs:

   ```bash
   kubectl logs -f deployment/emr-backend -n emr-production --tail=100
   ```

2. Verify database connectivity:

   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   ```

3. Check Fabric network status:

   ```bash
   docker exec peer0.hospital1.emr.com peer node status
   ```

4. Verify IPFS cluster:
   ```bash
   curl http://localhost:9094/id
   ```

**Mitigation Options:**

1. **Quick restart** (if transient issue):

   ```bash
   kubectl rollout restart deployment/emr-backend -n emr-production
   ```

2. **Rollback** (if recent deployment caused issue):

   ```bash
   kubectl rollout undo deployment/emr-backend -n emr-production
   ```

3. **Scale up** (if resource exhaustion):

   ```bash
   kubectl scale deployment/emr-backend --replicas=5 -n emr-production
   ```

4. **Failover** (if primary instance failed):
   ```bash
   # Switch to backup instance
   kubectl patch service emr-backend -p '{"spec":{"selector":{"app":"emr-backend-backup"}}}'
   ```

#### Database Outage

**Alert**: `DatabaseDown` **Impact**: Complete data access failure

**Immediate Actions:**

1. Check database status:

   ```bash
   systemctl status postgresql
   pg_isready -h $DB_HOST -p $DB_PORT
   ```

2. Review database logs:

   ```bash
   tail -f /var/log/postgresql/postgresql-*.log
   ```

3. Check disk space:
   ```bash
   df -h /var/lib/postgresql/
   ```

**Recovery Steps:**

1. **Service restart** (if process died):

   ```bash
   systemctl restart postgresql
   ```

2. **Disk cleanup** (if space issue):

   ```bash
   # Clean old WAL files
   sudo -u postgres pg_archivecleanup /var/lib/postgresql/12/main/pg_wal/ $(sudo -u postgres pg_controldata /var/lib/postgresql/12/main/ | grep "Latest checkpoint's REDO WAL file" | awk '{print $6}')
   ```

3. **Restore from backup** (if corruption):

   ```bash
   # Stop application
   kubectl scale deployment/emr-backend --replicas=0 -n emr-production

   # Restore database
   sudo -u postgres pg_restore -d $DB_NAME /backup/latest/emr_backup.sql

   # Restart application
   kubectl scale deployment/emr-backend --replicas=3 -n emr-production
   ```

### Security Incidents (P0)

#### Security Breach Detected

**Alert**: `SecurityBreach` **Impact**: Potential data exposure

**Immediate Actions (0-2 minutes):**

1. **Isolate affected systems**:

   ```bash
   # Block suspicious IP addresses
   iptables -A INPUT -s $SUSPICIOUS_IP -j DROP

   # Disable compromised user accounts
   kubectl exec -it deployment/emr-backend -- node scripts/disable-user.js --user-id $USER_ID
   ```

2. **Preserve evidence**:

   ```bash
   # Capture system state
   ps aux > /tmp/incident-processes.txt
   netstat -tulpn > /tmp/incident-network.txt

   # Copy logs
   cp /var/log/auth.log /tmp/incident-auth.log
   ```

3. **Notify security team** immediately

**Investigation Steps:**

1. Review security logs:

   ```bash
   # Check authentication failures
   grep "Failed password" /var/log/auth.log | tail -20

   # Review application security events
   curl -X GET "http://localhost:9200/emr-security-*/_search" -H 'Content-Type: application/json' -d'
   {
     "query": {
       "range": {
         "@timestamp": {
           "gte": "now-1h"
         }
       }
     },
     "sort": [{"@timestamp": {"order": "desc"}}]
   }'
   ```

2. Check for unauthorized access:

   ```bash
   # Review recent logins
   last -n 20

   # Check sudo usage
   grep sudo /var/log/auth.log | tail -10
   ```

3. Analyze network traffic:
   ```bash
   # Check for unusual connections
   ss -tulpn | grep ESTABLISHED
   ```

**Containment Actions:**

1. **Change all passwords** for affected accounts
2. **Revoke and reissue certificates**
3. **Update firewall rules** to block malicious traffic
4. **Enable additional monitoring** for affected systems

### Performance Degradation (P1)

#### High Response Latency

**Alert**: `HighResponseLatency` **Impact**: Poor user experience

**Investigation Steps:**

1. Check system resources:

   ```bash
   # CPU usage
   top -n 1 | head -20

   # Memory usage
   free -m

   # Disk I/O
   iostat -x 1 5
   ```

2. Review application metrics:

   ```bash
   # Check response times by endpoint
   curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
   ```

3. Analyze database performance:
   ```bash
   # Check for slow queries
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;"
   ```

**Optimization Actions:**

1. **Scale application**:

   ```bash
   kubectl scale deployment/emr-backend --replicas=5 -n emr-production
   ```

2. **Optimize database**:

   ```bash
   # Analyze and vacuum tables
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "ANALYZE; VACUUM;"
   ```

3. **Clear caches**:

   ```bash
   # Clear Redis cache
   redis-cli FLUSHALL
   ```

4. **Review and optimize queries** based on slow query analysis

### Blockchain Issues (P1)

#### Fabric Network Consensus Failure

**Alert**: `ConsensusFailure` **Impact**: Transaction processing stopped

**Investigation Steps:**

1. Check orderer status:

   ```bash
   docker logs orderer.emr.com --tail=50
   ```

2. Verify peer connectivity:

   ```bash
   docker exec peer0.hospital1.emr.com peer node status
   docker exec peer0.hospital2.emr.com peer node status
   docker exec peer0.regulator.emr.com peer node status
   ```

3. Check channel configuration:
   ```bash
   docker exec peer0.hospital1.emr.com peer channel list
   ```

**Recovery Actions:**

1. **Restart orderer** (if single point of failure):

   ```bash
   docker restart orderer.emr.com
   ```

2. **Rejoin peers to channel** (if peer disconnected):

   ```bash
   docker exec peer0.hospital1.emr.com peer channel join -b emr-channel.block
   ```

3. **Update channel configuration** (if configuration issue):

   ```bash
   # Generate new configuration
   configtxgen -profile EMRChannel -outputCreateChannelTx emr-channel.tx -channelID emr-channel

   # Update channel
   docker exec peer0.hospital1.emr.com peer channel update -o orderer.emr.com:7050 -c emr-channel -f emr-channel.tx
   ```

### IPFS Cluster Issues (P2)

#### IPFS Replication Failure

**Alert**: `IPFSReplicationFailure` **Impact**: Reduced data redundancy

**Investigation Steps:**

1. Check cluster status:

   ```bash
   curl http://localhost:9094/peers
   curl http://localhost:9094/pins
   ```

2. Verify node connectivity:
   ```bash
   curl http://localhost:5001/api/v0/swarm/peers
   ```

**Recovery Actions:**

1. **Restart cluster service**:

   ```bash
   docker restart cluster0 cluster1 cluster2
   ```

2. **Re-pin failed content**:

   ```bash
   # Get list of under-replicated pins
   curl http://localhost:9094/pins?status=pin_error

   # Re-pin content
   curl -X POST "http://localhost:9094/pins/$CID"
   ```

3. **Add new cluster node** (if permanent failure):
   ```bash
   # Bootstrap new node
   docker run -d --name cluster3 ipfs/ipfs-cluster:latest daemon --bootstrap /ip4/cluster0/tcp/9096/ipfs/$CLUSTER0_ID
   ```

## Communication Templates

### Incident Notification Template

```
🚨 INCIDENT ALERT 🚨

Incident ID: INC-YYYY-MMDD-XXXX
Severity: [P0/P1/P2/P3]
Status: [Investigating/Mitigating/Resolved]
Start Time: [YYYY-MM-DD HH:MM UTC]

Summary: [Brief description of the incident]

Impact: [Description of affected services and users]

Current Actions: [What is being done to resolve]

Next Update: [When next update will be provided]

Incident Commander: [Name and contact]
```

### Resolution Notification Template

```
✅ INCIDENT RESOLVED ✅

Incident ID: INC-YYYY-MMDD-XXXX
Resolution Time: [YYYY-MM-DD HH:MM UTC]
Duration: [Total incident duration]

Summary: [Brief description of what happened]

Root Cause: [What caused the incident]

Resolution: [How it was fixed]

Prevention: [Steps taken to prevent recurrence]

Post-Mortem: [Link to detailed post-mortem document]
```

## Post-Incident Procedures

### Immediate Post-Resolution (Within 1 hour)

1. Verify all systems are functioning normally
2. Monitor for any recurring issues
3. Update incident ticket with resolution details
4. Notify all stakeholders of resolution

### Post-Mortem Process (Within 24 hours)

1. Schedule post-mortem meeting with all involved parties
2. Create detailed timeline of events
3. Identify root causes and contributing factors
4. Document lessons learned
5. Create action items for prevention
6. Update runbooks and procedures

### Follow-up Actions (Within 1 week)

1. Implement preventive measures
2. Update monitoring and alerting
3. Conduct training if needed
4. Review and update incident response procedures
5. Share learnings with broader team

## Emergency Contacts

### 24/7 On-Call

- **Primary**: +1-555-0123 (ops-oncall@emr.com)
- **Secondary**: +1-555-0124 (ops-backup@emr.com)

### Escalation Contacts

- **Security Team**: +1-555-0125 (security-team@emr.com)
- **Compliance**: +1-555-0126 (compliance@emr.com)
- **Legal**: +1-555-0127 (legal@emr.com)
- **Executive**: +1-555-0128 (exec-team@emr.com)

### External Contacts

- **Cloud Provider**: [Provider support number]
- **Security Vendor**: [Vendor support number]
- **Legal Counsel**: [Law firm contact]

## Tools and Resources

### Monitoring and Alerting

- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### Logging and Analysis

- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

### System Access

- **Kubernetes Dashboard**: [URL]
- **Server SSH**: [Jump host details]
- **Database Access**: [Connection details]

### Documentation

- **Runbooks**: /docs/runbooks/
- **Architecture**: /docs/architecture/
- **API Documentation**: /docs/api/

Remember: In case of any doubt or if the situation is escalating beyond your
expertise, immediately escalate to the next level. Patient safety and data
security are our top priorities.
