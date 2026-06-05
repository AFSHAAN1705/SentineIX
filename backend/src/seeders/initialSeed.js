const bcrypt = require('bcryptjs');
const { Role, User, IncidentType, Incident, ThreatFeed, Assignment, InvestigationNote, Evidence, StatusLog, Notification, AuditLog, Resolution } = require('../models');

const generateRef = () => {
  const prefix = 'INC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedDatabase = async () => {
  console.log('🚀 Starting Demo Seeding...');
  try {
    // 1. Roles
    const rolesData = [
      { role_name: 'reporter', description: 'Can report incidents' },
      { role_name: 'analyst', description: 'Can investigate incidents' },
      { role_name: 'admin', description: 'Full access' }
    ];
    const roles = {};
    for (const r of rolesData) {
      const [role] = await Role.findOrCreate({ where: { role_name: r.role_name }, defaults: r });
      roles[r.role_name] = role;
    }
    console.log('✅ Roles seeded.');

    // 2. Incident Types
    const typeNames = ['Phishing', 'Malware', 'Ransomware', 'DDoS', 'Data Breach', 'Credential Theft', 'Insider Threat', 'Unauthorized Access', 'Social Engineering', 'Zero-Day Exploit'];
    const types = {};
    for (const name of typeNames) {
      const [type] = await IncidentType.findOrCreate({
        where: { type_name: name },
        defaults: { type_name: name, description: `Description for ${name}`, severity_weight: Math.floor(Math.random() * 10) + 1 }
      });
      types[name] = type;
    }
    console.log('✅ Incident types seeded.');

    // 3. Users (Check if already seeded)
    const userCount = await User.count();
    if (userCount > 10) {
      console.log('🌱 Database already populated. Skipping heavy seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('Demo@1234', 12);
    
    // Admin
    const adminExists = await User.scope('withPassword').findOne({ where: { email: 'admin@sentinelx.io' } });
    let admin = adminExists;
    if (!admin) {
        admin = await User.create({ role_id: roles['admin'].role_id, full_name: 'SentinelX Admin', email: 'admin@sentinelx.io', password_hash: passwordHash, department: 'SOC' });
    }

    // Analysts
    const analysts = [];
    
    // Seed AI Analyst
    let aiAnalyst = await User.findOne({ where: { email: 'ai.analyst@sentinelx.local' } });
    if (!aiAnalyst) {
      aiAnalyst = await User.create({ role_id: roles['analyst'].role_id, full_name: 'AI Analyst', email: 'ai.analyst@sentinelx.local', password_hash: passwordHash, department: 'Automated Response' });
    }
    analysts.push(aiAnalyst);

    for (let i = 1; i <= 5; i++) {
      const email = `analyst${i}@sentinelx.io`;
      let u = await User.findOne({ where: { email } });
      if (!u) u = await User.create({ role_id: roles['analyst'].role_id, full_name: `Analyst ${i}`, email, password_hash: passwordHash, department: 'SOC Analyst' });
      analysts.push(u);
    }

    // Reporters
    const reporters = [];
    for (let i = 1; i <= 20; i++) {
      const email = `reporter${i}@company.com`;
      let u = await User.findOne({ where: { email } });
      if (!u) u = await User.create({ role_id: roles['reporter'].role_id, full_name: `Reporter ${i}`, email, password_hash: passwordHash, department: 'General' });
      reporters.push(u);
    }
    console.log('✅ 1 Admin, 5 Analysts, 20 Reporters seeded.');

    // 4. Incidents
    const titles = [
      'Microsoft 365 Phishing Campaign', 'Suspicious Login Attempt from Foreign IP', 'Student Email Account Compromised',
      'Malware Infection in Computer Lab', 'Unauthorized Access to Faculty Portal', 'Database Breach Investigation',
      'Ransomware Detected on Server', 'Credential Stuffing Attack', 'Fake Scholarship Email Campaign', 'Internal Data Leakage Incident'
    ];
    
    const severities = [];
    for(let i=0; i<10; i++) severities.push('low');
    for(let i=0; i<15; i++) severities.push('medium');
    for(let i=0; i<15; i++) severities.push('high');
    for(let i=0; i<10; i++) severities.push('critical');
    // Shuffle severities
    severities.sort(() => Math.random() - 0.5);

    const statuses = ['open', 'assigned', 'investigating', 'under_review', 'resolved', 'closed'];

    const incidents = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (let i = 0; i < 50; i++) {
      const reporter = reporters[Math.floor(Math.random() * reporters.length)];
      const typeName = typeNames[Math.floor(Math.random() * typeNames.length)];
      const title = titles[Math.floor(Math.random() * titles.length)] + ` #${i+1}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const createdAt = randomDate(sixMonthsAgo, new Date());
      let resolvedAt = null;
      let closedAt = null;
      if (status === 'resolved' || status === 'closed') {
        resolvedAt = randomDate(createdAt, new Date());
      }
      if (status === 'closed') {
        closedAt = randomDate(resolvedAt || createdAt, new Date());
      }

      const inc = await Incident.create({
        incident_ref: generateRef(),
        reporter_id: reporter.user_id,
        type_id: types[typeName].type_id,
        title,
        description: `Detailed description for ${title}. Activity observed matching ${typeName} tactics. Requires immediate review.`,
        severity: severities[i],
        status,
        created_at: createdAt,
        updated_at: resolvedAt || createdAt,
        resolved_at: resolvedAt,
        closed_at: closedAt,
        risk_score: Math.floor(Math.random() * 100),
        risk_level: severities[i]
      });
      incidents.push(inc);

      // Status logs
      await StatusLog.create({ incident_id: inc.incident_id, changed_by: reporter.user_id, old_status: null, new_status: 'open', reason: 'Initial report', created_at: createdAt });
    }
    console.log('✅ 50 Incidents and timelines seeded.');

    // 5. Assignments & Work
    for (const inc of incidents) {
      if (inc.status !== 'open') {
        const analyst = analysts[Math.floor(Math.random() * analysts.length)];
        
        await Assignment.create({
          incident_id: inc.incident_id,
          analyst_id: analyst.user_id,
          assigned_by: admin.user_id,
          is_active: inc.status !== 'closed',
          created_at: inc.created_at
        });

        // Notes
        const noteCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 notes
        for (let j = 0; j < noteCount; j++) {
          await InvestigationNote.create({
            incident_id: inc.incident_id,
            analyst_id: analyst.user_id,
            content: `Investigation finding #${j+1}: Analyzing logs and corroborating with threat intelligence.`,
            created_at: randomDate(inc.created_at, inc.resolved_at || new Date())
          });
        }

        // Resolution
        if (inc.status === 'resolved' || inc.status === 'closed') {
          await Resolution.create({
            incident_id: inc.incident_id,
            resolved_by: analyst.user_id,
            resolution_summary: 'Issue was investigated and mitigated. Credentials reset and IP blocked.',
            resolution_type: 'mitigated',
            time_to_resolve_hours: Math.floor(Math.random() * 48) + 1,
            created_at: inc.resolved_at
          });
        }
      }
    }

    // 6. Notifications (100+)
    const notifs = [];
    for (let i = 0; i < 120; i++) {
      const user = reporters[Math.floor(Math.random() * reporters.length)];
      notifs.push({
        user_id: user.user_id,
        title: 'Incident Update',
        message: 'There is a new update on your reported incident.',
        type: 'incident_update',
        is_read: Math.random() > 0.5,
        created_at: randomDate(sixMonthsAgo, new Date())
      });
    }
    await Notification.bulkCreate(notifs);

    // 7. Audit Logs (200+)
    const audits = [];
    for (let i = 0; i < 250; i++) {
      const user = analysts[Math.floor(Math.random() * analysts.length)];
      audits.push({
        user_id: user.user_id,
        action: 'UPDATE_INCIDENT',
        entity_type: 'incident',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 Demo',
        created_at: randomDate(sixMonthsAgo, new Date())
      });
    }
    await AuditLog.bulkCreate(audits);

    // 8. Threat Intelligence (25+)
    const threats = [];
    const threatCats = ['Malware', 'Phishing', 'Ransomware', 'Botnets', 'Zero-Day Exploits', 'Credential Theft'];
    for (let i = 0; i < 30; i++) {
      const cat = threatCats[Math.floor(Math.random() * threatCats.length)];
      threats.push({
        created_by: admin.user_id,
        title: `${cat} Campaign ${i+1} Detected`,
        description: `Detailed IoCs and TTPs for ${cat} campaign observed in the wild.`,
        threat_type: cat.toLowerCase().replace(/ /g, '_').replace('-', '_'),
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        source: 'OSINT',
        created_at: randomDate(sixMonthsAgo, new Date())
      });
    }
    // ensure valid threat types since model validates them
    const validThreatTypes = ['malware', 'ransomware', 'phishing', 'botnet', 'zero_day', 'credential_attack', 'ddos', 'apt', 'other'];
    threats.forEach(t => {
      if(!validThreatTypes.includes(t.threat_type)) t.threat_type = 'other';
    });
    
    await ThreatFeed.bulkCreate(threats);

    console.log('✅ 100+ Notifications, 200+ Audits, 25+ Threats seeded.');
    console.log('🌱 Database seeding fully complete!');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  }
};

module.exports = { seedDatabase };
