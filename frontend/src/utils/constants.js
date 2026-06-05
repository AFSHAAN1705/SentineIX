export const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

export const STATUS_COLORS = {
  open: '#f59e0b',
  assigned: '#3b82f6',
  investigating: '#8b5cf6',
  under_review: '#f97316',
  resolved: '#10b981',
  closed: '#6b7280',
};

export const INCIDENT_TYPE_ICONS = {
  Phishing: 'phishing',
  Malware: 'bug_report',
  Ransomware: 'lock',
  DDoS: 'warning',
  'Data Breach': 'security',
  'Credential Theft': 'key',
  'Insider Threat': 'person_off',
  'Unauthorized Access': 'no_accounts',
  'Social Engineering': 'psychology',
  'Zero-Day Exploit': 'bolt',
};

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['open', 'assigned', 'investigating', 'under_review', 'resolved', 'closed'];

export const THREAT_TYPES = [
  { value: 'malware', label: 'Malware' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'botnet', label: 'Botnet' },
  { value: 'zero_day', label: 'Zero-Day' },
  { value: 'credential_attack', label: 'Credential Attack' },
  { value: 'ddos', label: 'DDoS' },
  { value: 'apt', label: 'APT' },
  { value: 'other', label: 'Other' },
];
