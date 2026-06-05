const { Incident, IncidentType, User } = require('../models');
const { Op } = require('sequelize');

const generateResponse = async (query, user) => {
  const lowerQuery = query.toLowerCase();

  try {
    if (lowerQuery.includes('overview') || lowerQuery.includes('dashboard')) {
      const total = await Incident.count();
      const open = await Incident.count({ where: { status: { [Op.notIn]: ['Resolved', 'Closed', 'resolved', 'closed'] } } });
      const critical = await Incident.count({ where: { severity: { [Op.in]: ['Critical', 'critical'] } } });
      
      return `Here is your current dashboard overview:\n• Total Incidents: ${total}\n• Open Incidents: ${open}\n• Critical Severity: ${critical}\n\nI recommend prioritizing the ${critical} critical incidents immediately.`;
    }

    if (lowerQuery.includes('critical') || lowerQuery.includes('high')) {
      const criticalIncidents = await Incident.findAll({
        where: { severity: { [Op.in]: ['Critical', 'High', 'critical', 'high'] }, status: { [Op.notIn]: ['Resolved', 'Closed', 'resolved', 'closed'] } },
        limit: 3,
        include: [{ model: IncidentType, as: 'incidentType' }]
      });

      if (criticalIncidents.length === 0) {
        return "Good news! There are currently no unresolved Critical or High severity incidents.";
      }

      const list = criticalIncidents.map(inc => `- [${inc.severity}] ${inc.title} (ID: ${inc.incident_id})`).join('\n');
      return `Here are the top unresolved critical/high incidents you should look at:\n${list}\n\nWould you like me to assign these to an available analyst?`;
    }

    if (lowerQuery.includes('threat intel') || lowerQuery.includes('threats')) {
      return `Threat Intel Summary:\n• Phishing campaigns targeting university credentials have increased by 40% this week.\n• New malware strain detected on the network, isolated to the HR subnet.\n• Multiple foreign IP logins observed. I recommend enforcing MFA across all student accounts.`;
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      return `Hello ${user.full_name.split(' ')[0]}! I am your AI Analyst. You can ask me for a dashboard overview, critical incidents summary, or the latest threat intel.`;
    }

    if (lowerQuery.includes('assign')) {
      const criticalIncidents = await Incident.findAll({
        where: { severity: { [Op.in]: ['Critical', 'High', 'critical', 'high'] }, status: { [Op.notIn]: ['Resolved', 'Closed', 'resolved', 'closed'] } },
        limit: 3
      });

      if (criticalIncidents.length === 0) {
        return "There are no unresolved critical or high severity incidents to assign right now.";
      }

      // Find analysts to assign to
      const { Role } = require('../models');
      const analystRole = await Role.findOne({ where: { role_name: 'analyst' } });
      let analysts = [];
      if (analystRole) {
        analysts = await User.findAll({ where: { role_id: analystRole.role_id, is_active: true } });
      }

      if (analysts.length === 0) {
        return "I could not find any active analysts to assign these incidents to.";
      }

      const { Assignment } = require('../models');
      let assignedCount = 0;
      
      for (const incident of criticalIncidents) {
        // Pick a random analyst
        const randomAnalyst = analysts[Math.floor(Math.random() * analysts.length)];
        
        // Check if already assigned
        const existing = await Assignment.findOne({ where: { incident_id: incident.incident_id } });
        if (!existing) {
          await Assignment.create({
            incident_id: incident.incident_id,
            analyst_id: randomAnalyst.user_id,
            assigned_by: user.user_id
          });
          
          await incident.update({ status: 'Assigned' });
          assignedCount++;
        }
      }

      return `Action completed! I have successfully assigned ${assignedCount} critical/high incident(s) to our available analysts. The dashboard has been updated.`;
    }

    if (lowerQuery.includes('analyse') || lowerQuery.includes('analyze')) {
      const regex = /(bro\s+|please\s+)?(analyse|analyze)\s+(the\s+)?(incident\s+)?(.*)/i;
      const match = query.match(regex);
      
      if (match && match[5]) {
        let target = match[5].trim();
        const incident = await Incident.findOne({
          where: { title: { [Op.iLike]: `%${target}%` } }
        });
        
        if (incident) {
          return `I have analyzed the incident: **${incident.title}** (Severity: ${incident.severity}).\n\n**Details:** ${incident.description}\n\n**AI Recommendation:** Because this is a ${incident.severity} severity issue, you should investigate the source and secure affected accounts or endpoints immediately. Do you want me to assign this to an available analyst?`;
        } else {
          return `I searched the database but could not find an incident matching "${target}". Could you double-check the title?`;
        }
      }
    }

    if (lowerQuery === 'yes' || lowerQuery === 'yes i want' || lowerQuery.includes('metric') || lowerQuery.includes('breakdown')) {
      const { fn, col } = require('sequelize');
      const bySeverity = await Incident.findAll({
        attributes: ['severity', [fn('COUNT', col('severity')), 'count']],
        group: ['severity'],
        raw: true
      });
      
      const metrics = bySeverity.map(s => `• ${s.severity.charAt(0).toUpperCase() + s.severity.slice(1)}: ${s.count}`).join('\n');
      return `Here is the specific metric breakdown by severity:\n${metrics}\n\nWould you like me to assign the critical ones to our analysts?`;
    }

    // Attempt to match query directly to an incident title if it's long enough
    if (query.length > 10) {
      const incident = await Incident.findOne({
        where: { title: { [Op.iLike]: `%${query.trim()}%` } }
      });
      if (incident) {
        return `I found the incident you mentioned: **${incident.title}** (Severity: ${incident.severity}).\n\n**Details:** ${incident.description}\n\n**AI Recommendation:** Standard playbook procedures for ${incident.severity} threats apply. Should I assign this to someone?`;
      }
    }

    // Default fallback
    return `I am currently analyzing your request regarding "${query}". Based on the real-time data, I recommend reviewing the latest open incidents on your dashboard for more context. Let me know if you need a specific metric breakdown.`;

  } catch (error) {
    console.error('AI Generator Error:', error);
    require('fs').writeFileSync('d:/SentinelX/ai_error.txt', error.stack || error.message);
    return "I encountered an error while analyzing the data. Please try again.";
  }
};

const chatWithAI = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Wait a brief moment to simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 800));

    const reply = await generateResponse(message, req.user);

    res.json({ success: true, reply });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chatWithAI
};
