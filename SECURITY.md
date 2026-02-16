# SiteMedic Location Tracking - Security Documentation

**Last Updated**: 2026-02-15
**Security Level**: Production-Ready
**Compliance**: GDPR, UK Data Protection Act 2018, ISO 27001 practices

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Row-Level Security (RLS)](#row-level-security-rls)
3. [Role-Based Access Control](#role-based-access-control)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Audit Logging](#audit-logging)
7. [Threat Model](#threat-model)
8. [Security Best Practices](#security-best-practices)
9. [Incident Response](#incident-response)

---

## Security Overview

### Defense in Depth Strategy

SiteMedic location tracking uses multiple layers of security:

1. **Network Layer**: HTTPS/TLS 1.3 encryption
2. **Authentication**: Supabase Auth (JWT tokens)
3. **Authorization**: Row-Level Security (RLS) policies
4. **Application Layer**: Function-level permission checks
5. **Data Layer**: Encryption at rest, immutable audit trails
6. **Monitoring**: Real-time security audit logging

### Security Principles

- ✅ **Least Privilege**: Users get minimum necessary permissions
- ✅ **Defense in Depth**: Multiple security layers
- ✅ **Zero Trust**: Verify every request
- ✅ **Immutable Audit**: Cannot modify/delete audit logs
- ✅ **Fail Secure**: Deny by default
- ✅ **Transparency**: All access logged

---

## Row-Level Security (RLS)

All location tracking tables use PostgreSQL Row-Level Security to enforce data access at the database level.

### medic_location_pings

**Enabled**: ✅ Yes
**Immutable**: ✅ Yes (no UPDATE/DELETE)

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ✅ Own data only | ❌ No |
| SELECT | ✅ Own data only | ✅ All data |
| UPDATE | ❌ Never | ❌ Never |
| DELETE | ❌ Never | ❌ Never |

**Policies:**
```sql
-- Medics can INSERT their own pings
CREATE POLICY "Medics can insert own location pings"
  ON medic_location_pings FOR INSERT
  WITH CHECK (medic_id = auth.uid() AND is_medic());

-- Medics can SELECT their own pings
CREATE POLICY "Medics can view own location pings"
  ON medic_location_pings FOR SELECT
  USING (medic_id = auth.uid() OR is_admin());
```

**Rationale**: Location pings are immutable for audit integrity. Medics can only see their own location history. Admins need visibility for command center and billing disputes.

### medic_shift_events

**Enabled**: ✅ Yes
**Immutable**: ✅ Yes (no UPDATE/DELETE)

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ✅ Own events | ❌ No |
| SELECT | ✅ Own events | ✅ All events |
| UPDATE | ❌ Never | ❌ Never |
| DELETE | ❌ Never | ❌ Never |

**Rationale**: Shift events are billing records and cannot be modified. This prevents tampering with arrival/departure times.

### medic_location_audit

**Enabled**: ✅ Yes
**Immutable**: ✅ Yes (no UPDATE/DELETE)

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ✅ Via system | ✅ Via system |
| SELECT | ✅ Own logs | ✅ All logs |
| UPDATE | ❌ Never | ❌ Never |
| DELETE | ❌ Never | ❌ Never |

**Rationale**: Audit logs provide transparency. Medics can see who viewed their location data (GDPR transparency requirement). Logs are permanent and cannot be tampered with.

### geofences

**Enabled**: ✅ Yes
**Mutable**: ⚠️ Admins only

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ❌ No | ✅ Yes |
| SELECT | ✅ Own bookings | ✅ All |
| UPDATE | ❌ No | ✅ Yes |
| DELETE | ❌ Never | ❌ Never |

**Rationale**: Geofences can be adjusted by admins (e.g., expand radius for large sites). Medics can view geofences for their bookings. Geofence history is kept (no DELETE).

### medic_location_consent

**Enabled**: ✅ Yes
**Mutable**: ⚠️ Medics can withdraw

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ✅ Own consent | ❌ No |
| SELECT | ✅ Own consent | ✅ All |
| UPDATE | ✅ Withdraw only | ❌ No |
| DELETE | ❌ Never | ❌ Never |

**Rationale**: Medics control their own consent. Withdrawal is UPDATE (not DELETE) to maintain proof of withdrawal. Admins can view consent status but cannot modify it.

### medic_alerts

**Enabled**: ✅ Yes
**Mutable**: ⚠️ Admins can dismiss/resolve

| Action | Medic | Admin |
|--------|-------|-------|
| INSERT | ❌ Via system | ✅ Via system |
| SELECT | ✅ Own alerts | ✅ All alerts |
| UPDATE | ❌ No | ✅ Dismiss/resolve |
| DELETE | ❌ Never | ❌ Never |

**Rationale**: Alerts are created by monitoring system. Admins can dismiss/resolve alerts. Medics can view their own alerts for transparency. Alert history is preserved.

---

## Role-Based Access Control

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **medic** | Field medic | INSERT/SELECT own location data, GDPR export/delete |
| **admin** | System admin | Full access to all location data, analytics, alerts |
| **site_manager** | Site supervisor | SELECT location data for their sites only |
| **support** | Customer support | Limited read access for troubleshooting |

### Role Assignment

**Database Table:**
```sql
CREATE TABLE user_roles (
  user_id UUID,
  role TEXT CHECK (role IN ('admin', 'medic', 'site_manager', 'support')),
  granted_at TIMESTAMPTZ,
  granted_by UUID
);
```

**Assign Role (Admin only):**
```sql
SELECT assign_user_role(
  p_user_id := 'USER_ID',
  p_role := 'admin',
  p_notes := 'IT administrator'
);
```

**Revoke Role (Admin only):**
```sql
SELECT revoke_user_role(
  p_user_id := 'USER_ID',
  p_role := 'admin'
);
```

**Check User Roles:**
```sql
SELECT get_user_roles('USER_ID');
-- Or current user:
SELECT get_user_roles();
```

### Permission Helper Functions

**is_admin()**: Returns true if current user has admin role
```sql
SELECT is_admin();
```

**is_medic()**: Returns true if current user is a medic
```sql
SELECT is_medic();
```

**current_medic_id()**: Returns medic ID if user is a medic
```sql
SELECT current_medic_id();
```

---

## Data Protection

### Encryption

**In Transit:**
- ✅ HTTPS/TLS 1.3 for all API requests
- ✅ WebSocket connections encrypted (wss://)
- ✅ Certificate pinning recommended for mobile app

**At Rest:**
- ✅ Database encryption (Supabase default: AES-256)
- ✅ Backup encryption
- ✅ Storage encryption for offline queue (AsyncStorage encryption on mobile)

### Data Minimization

- Location pings: **30 days** retention (GDPR)
- Shift events: **Permanent** (billing records)
- Audit logs: **6 years** (UK tax law), then anonymized

### Anonymization

After 6 years, audit logs are anonymized:
```sql
SELECT anonymize_old_audit_logs();
-- Removes: IP addresses, user agents
-- Keeps: Action types, timestamps, descriptions
```

### Data Isolation

- Each medic can only access their own data
- RLS enforced at database level (not application)
- No cross-medic data leakage possible
- Admin access is logged in audit trail

---

## API Security

### Authentication

All API endpoints require valid JWT token:
```http
Authorization: Bearer <JWT_TOKEN>
```

**Token Validation:**
- Supabase Auth validates token on every request
- Expired tokens rejected (1 hour TTL)
- Refresh tokens used for renewal

### Rate Limiting

**Edge Function Rate Limits:**
- Location ping: 120 pings/hour per medic (2 per minute)
- GDPR export: 10 exports/day per user
- GDPR delete: 1 deletion/day per user
- Analytics: 100 requests/hour per admin

**Database Function:**
```sql
SELECT check_rate_limit(
  p_user_id := auth.uid(),
  p_action := 'location_ping',
  p_limit := 120,
  p_window_seconds := 3600
);
```

### Input Validation

**Location Pings:**
- ✅ UK coordinate bounds (49.9-60.9 lat, -8.6-2.0 lng)
- ✅ GPS accuracy <500m (reject unreliable)
- ✅ Timestamp within 60 minutes
- ✅ Battery level 0-100%
- ✅ No future timestamps (clock skew protection)

**SQL Injection Protection:**
- ✅ Parameterized queries only
- ✅ No string concatenation for SQL
- ✅ Supabase client handles escaping

### CORS Policy

**Allowed Origins:**
- Production: `https://your-domain.com`
- Development: `http://localhost:30500`
- Mobile apps: Native (no CORS)

**Headers:**
```http
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: authorization, content-type
```

---

## Audit Logging

### What Gets Logged

**All security-relevant events:**
- ✅ Location ping received
- ✅ Shift event created
- ✅ Admin viewed medic location
- ✅ Geofence entry/exit detected
- ✅ Alert triggered/resolved
- ✅ Data exported (GDPR)
- ✅ Data deleted (GDPR)
- ✅ Consent given/withdrawn
- ✅ Role assigned/revoked
- ✅ Failed authentication attempts

### Audit Log Schema

```sql
CREATE TABLE medic_location_audit (
  id UUID PRIMARY KEY,
  medic_id UUID,
  booking_id UUID,
  action_type TEXT,           -- What happened
  action_timestamp TIMESTAMPTZ,
  actor_type TEXT,            -- medic, admin, system
  actor_user_id UUID,         -- Who did it
  description TEXT,           -- Human-readable
  ip_address TEXT,            -- Where from
  user_agent TEXT,            -- What browser/app
  metadata JSONB              -- Additional context
);
```

### Audit Log Retention

- **6 years** minimum (UK tax law)
- After 6 years: **Anonymized** (remove IP, user agent)
- Never deleted (permanent audit trail)

### Querying Audit Logs

**View all access to specific medic's data:**
```sql
SELECT
  action_type,
  action_timestamp,
  actor_type,
  description
FROM medic_location_audit
WHERE medic_id = 'MEDIC_ID'
ORDER BY action_timestamp DESC;
```

**Admin access audit:**
```sql
SELECT
  medic_id,
  action_timestamp,
  actor_user_id AS admin_id,
  ip_address
FROM medic_location_audit
WHERE action_type = 'admin_viewed_location'
  AND action_timestamp > NOW() - INTERVAL '7 days'
ORDER BY action_timestamp DESC;
```

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| **Unauthorized data access** | RLS policies + JWT auth |
| **SQL injection** | Parameterized queries |
| **Data tampering** | Immutable audit trails |
| **Location spoofing** | GPS spoofing detection |
| **Account takeover** | Strong auth + session management |
| **Insider threat** | Admin access logging |
| **Data breach** | Encryption at rest + in transit |
| **Replay attacks** | Timestamp validation |
| **Man-in-the-middle** | TLS 1.3 |

### Attack Scenarios

**Scenario 1: Medic tries to view another medic's location**
- ❌ Blocked by RLS policy
- Query returns no results (not an error, prevents enumeration)
- Logged in audit trail

**Scenario 2: Medic tries to modify their own location ping**
- ❌ Blocked by RLS (no UPDATE policy)
- Database rejects UPDATE
- Immutable audit trail preserved

**Scenario 3: Admin views medic location data**
- ✅ Allowed by RLS policy
- ✅ Logged in audit trail (transparency)
- Medic can see in their privacy dashboard

**Scenario 4: Attacker spoofs GPS location**
- ⚠️ Detected by GPS spoofing checks:
  - Perfect accuracy (<1m) = suspicious
  - Low coordinate precision = suspicious
  - Impossible speed (>200 km/h) = suspicious
- Logged with warnings in audit trail
- Admin alerted if patterns detected

---

## Security Best Practices

### For Developers

1. **Never bypass RLS**: Always use authenticated Supabase client
2. **Use SECURITY DEFINER sparingly**: Only for privilege elevation functions
3. **Log all admin actions**: Transparency is critical
4. **Validate all inputs**: Never trust client data
5. **Use parameterized queries**: Prevent SQL injection
6. **Keep dependencies updated**: Regular security patches
7. **Test RLS policies**: Verify medics can't access others' data

### For Admins

1. **Assign minimal roles**: Least privilege principle
2. **Rotate API keys**: Every 90 days minimum
3. **Review audit logs**: Weekly security checks
4. **Monitor alerts**: Unusual activity patterns
5. **Backup regularly**: Daily encrypted backups
6. **Test disaster recovery**: Quarterly recovery drills
7. **Document incidents**: All security events

### For Medics

1. **Protect your credentials**: Don't share passwords
2. **Log out when done**: Especially on shared devices
3. **Report suspicious activity**: Security concerns to admin
4. **Keep app updated**: Install security patches
5. **Use strong passwords**: 12+ characters, unique
6. **Enable 2FA**: If available

---

## Incident Response

### Security Incident Classification

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Data breach, unauthorized admin access | Immediate (1 hour) |
| **High** | Failed security control, suspicious activity | Same day (4 hours) |
| **Medium** | Policy violation, anomaly detected | Next day (24 hours) |
| **Low** | Informational, audit finding | Next week (7 days) |

### Incident Response Procedure

**1. Detection**
- Monitor audit logs for anomalies
- Review alert trends
- User reports

**2. Containment**
- Revoke compromised credentials
- Disable affected accounts
- Block malicious IPs

**3. Investigation**
```sql
-- Check audit logs for incident
SELECT *
FROM medic_location_audit
WHERE action_timestamp BETWEEN 'START' AND 'END'
  AND (
    action_type LIKE '%failed%'
    OR ip_address = 'SUSPICIOUS_IP'
  )
ORDER BY action_timestamp;
```

**4. Remediation**
- Patch vulnerabilities
- Reset passwords
- Update security policies

**5. Recovery**
- Restore from backups if needed
- Verify data integrity
- Resume normal operations

**6. Lessons Learned**
- Document incident
- Update security policies
- Train team on prevention

### Emergency Contacts

- **Security Lead**: [security@sitemedic.com]
- **DPO (Data Protection Officer)**: [dpo@sitemedic.com]
- **ICO (UK)**: +44 303 123 1113
- **Supabase Support**: support@supabase.com

---

## Security Compliance

### GDPR Compliance

- ✅ Data minimization (30-day retention)
- ✅ Right to access (export data)
- ✅ Right to erasure (delete data)
- ✅ Right to object (withdraw consent)
- ✅ Data portability (JSON export)
- ✅ Transparent processing (audit logs)
- ✅ Consent management
- ✅ Breach notification procedures

### UK Data Protection Act 2018

- ✅ Special category data handling (location)
- ✅ Lawful basis (consent + legitimate interest)
- ✅ Accountability (audit trails)
- ✅ 6-year tax record retention

### ISO 27001 Alignment

- ✅ Access control (RLS + RBAC)
- ✅ Cryptography (TLS + AES-256)
- ✅ Incident management (procedures)
- ✅ Logging and monitoring
- ✅ Secure development lifecycle

---

## Security Checklist

### Deployment Security

- [ ] All tables have RLS enabled
- [ ] Admin users assigned in user_roles
- [ ] API keys rotated from defaults
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Backup encryption verified
- [ ] Audit log retention configured
- [ ] Incident response plan tested
- [ ] Security training completed

### Ongoing Security

- [ ] Weekly audit log review
- [ ] Monthly access review (revoke unused)
- [ ] Quarterly API key rotation
- [ ] Annual penetration testing
- [ ] Dependency updates (monthly)
- [ ] Backup restoration test (quarterly)
- [ ] GDPR compliance audit (annual)
- [ ] Security awareness training (annual)

---

**Last Reviewed**: 2026-02-15
**Next Review**: 2026-05-15
**Security Officer**: [Name]
**Version**: 1.0
