/**
 * Risk Scoring Engine
 * Formula: (severity_weight * 30) + (type_weight * 40) + (time_open_weight * 30)
 */

const SEVERITY_WEIGHTS = { low: 1, medium: 3, high: 7, critical: 10 };

const TYPE_WEIGHTS = {
  'Phishing': 4,
  'Malware': 7,
  'Ransomware': 10,
  'DDoS': 6,
  'Data Breach': 9,
  'Credential Theft': 8,
  'Insider Threat': 7,
  'Unauthorized Access': 6,
  'Social Engineering': 5,
  'Zero-Day Exploit': 10
};

const calculateRiskScore = (severity, incidentTypeName, createdAt) => {
  const severityWeight = SEVERITY_WEIGHTS[severity] || 1;

  const typeWeight = TYPE_WEIGHTS[incidentTypeName] || 5;

  const hoursOpen = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  let timeWeight = 1;
  if (hoursOpen < 1) timeWeight = 1;
  else if (hoursOpen < 24) timeWeight = 3;
  else if (hoursOpen < 72) timeWeight = 6;
  else timeWeight = 10;

  const rawScore = (severityWeight * 30 + typeWeight * 40 + timeWeight * 30) / 10;
  const score = Math.min(100, parseFloat(rawScore.toFixed(2)));

  let level;
  if (score < 25) level = 'low';
  else if (score < 50) level = 'medium';
  else if (score < 75) level = 'high';
  else level = 'critical';

  return { score, level };
};

module.exports = { calculateRiskScore };
