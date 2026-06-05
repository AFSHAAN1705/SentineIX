const { User, Role, Incident, InvestigationNote, Assignment, StatusLog } = require('../models');

const analyzeIncidentWithAI = async (incidentId, requestorId) => {
  // 1. Ensure AI Analyst user exists
  let aiRole = await Role.findOne({ where: { role_name: 'analyst' } });
  if (!aiRole) {
    aiRole = await Role.create({ role_name: 'analyst', description: 'Analyst Role' });
  }

  let aiAnalyst = await User.findOne({ where: { email: 'ai.analyst@sentinelx.local' } });
  
  if (!aiAnalyst) {
    aiAnalyst = await User.create({
      full_name: 'AI Analyst',
      email: 'ai.analyst@sentinelx.local',
      password_hash: 'SecurePassword123!', // Required by model, but won't be used to log in
      role_id: aiRole.role_id,
      department: 'Automated Response',
      is_active: true
    });
  }

  const incident = await Incident.findByPk(incidentId);
  
  // 2. Generate a mock AI Analysis
  const mockAnalysis = `**AI Automated Analysis**\n\n` +
    `Based on the provided details for incident \`${incident.incident_ref}\` (Severity: ${incident.severity}):\n` +
    `- **Risk Score Context**: The current risk score is ${incident.risk_score}. Given the affected systems, immediate containment is recommended.\n` +
    `- **Indicators**: No active beacons were identified from the source IP in the last 24 hours.\n` +
    `- **Recommendation**: Please review uploaded evidence logs. If false positive, resolve and close. Otherwise, proceed with standard isolation playbook.\n\n` +
    `*Analysis generated automatically by SentinelX AI.*`;

  // 3. Create Investigation Note
  const note = await InvestigationNote.create({
    incident_id: incidentId,
    analyst_id: aiAnalyst.user_id,
    content: mockAnalysis,
    note_type: 'finding'
  });

  // 4. Optionally assign the incident to AI Analyst if not assigned
  // We can just automatically add it to assignments so it shows up in history
  const existingAssignment = await Assignment.findOne({
    where: { incident_id: incidentId, is_active: true }
  });

  if (!existingAssignment) {
    await Assignment.create({
      incident_id: incidentId,
      analyst_id: aiAnalyst.user_id,
      assigned_by: requestorId,
      assignment_note: 'Auto-assigned to AI for initial triage.',
      is_active: true
    });
    
    // Update incident status
    if (incident.status === 'open') {
      await incident.update({ status: 'assigned' });
      await StatusLog.create({
        incident_id: incident.incident_id,
        changed_by: requestorId,
        old_status: 'open',
        new_status: 'assigned',
        reason: 'Auto-assigned to AI Analyst'
      });
    }
  }

  return { note };
};

module.exports = { analyzeIncidentWithAI };
