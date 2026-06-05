const { Op, fn, col, literal } = require('sequelize');
const {
  Incident, User, Role, IncidentType, Assignment, Resolution, sequelize
} = require('../models');
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');

const getAnalyticsDashboard = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from) dateWhere[Op.gte] = new Date(from);
    if (to) dateWhere[Op.lte] = new Date(to);
    const incidentWhere = Object.keys(dateWhere).length ? { created_at: dateWhere } : {};

    const [
      totalIncidents, openIncidents, resolvedIncidents, criticalIncidents,
      avgRiskScore, bySeverity, byStatus, byType, byMonth, topAnalysts
    ] = await Promise.all([
      Incident.count({ where: incidentWhere }),
      Incident.count({ where: { ...incidentWhere, status: ['open', 'assigned', 'investigating', 'under_review'] } }),
      Incident.count({ where: { ...incidentWhere, status: 'resolved' } }),
      Incident.count({ where: { ...incidentWhere, severity: 'critical' } }),
      Incident.findOne({
        attributes: [[fn('AVG', col('risk_score')), 'avg']],
        where: incidentWhere,
        raw: true
      }),
      Incident.findAll({
        attributes: ['severity', [fn('COUNT', col('incident_id')), 'count']],
        where: incidentWhere,
        group: ['severity'],
        raw: true
      }),
      Incident.findAll({
        attributes: ['status', [fn('COUNT', col('incident_id')), 'count']],
        where: incidentWhere,
        group: ['status'],
        raw: true
      }),
      Incident.findAll({
        attributes: ['type_id', [fn('COUNT', col('Incident.incident_id')), 'count']],
        include: [{ model: IncidentType, as: 'incidentType', attributes: ['type_name'] }],
        where: incidentWhere,
        group: ['Incident.type_id', 'incidentType.type_id', 'incidentType.type_name'],
        raw: true,
        nest: true
      }),
      Incident.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
          [fn('COUNT', col('incident_id')), 'count'],
          [fn('SUM', literal("CASE WHEN severity = 'critical' THEN 1 ELSE 0 END")), 'critical_count']
        ],
        where: { created_at: { [Op.gte]: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
        group: [literal("DATE_TRUNC('month', created_at)")],
        order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
        raw: true
      }),
      Resolution.findAll({
        attributes: ['resolved_by', [fn('COUNT', col('resolution_id')), 'resolved_count']],
        include: [{ model: User, as: 'resolver', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }],
        group: ['resolved_by', 'resolver.user_id', 'resolver.full_name', 'resolver.email', 'resolver.avatar_url'],
        order: [[literal('COUNT(resolution_id)'), 'DESC']],
        limit: 5,
        raw: true,
        nest: true
      })
    ]);

    // Avg resolution time
    const avgResTime = await Resolution.findOne({
      attributes: [[fn('AVG', col('time_to_resolve_hours')), 'avg']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalIncidents,
          open: openIncidents,
          resolved: resolvedIncidents,
          critical: criticalIncidents,
          avg_risk_score: parseFloat(avgRiskScore?.avg || 0).toFixed(2),
          avg_resolution_hours: parseFloat(avgResTime?.avg || 0).toFixed(2)
        },
        bySeverity,
        byStatus,
        byType,
        monthlyTrend: byMonth,
        topAnalysts
      }
    });
  } catch (error) { next(error); }
};

const exportCSV = async (req, res, next) => {
  try {
    const incidents = await Incident.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['full_name', 'email'] },
        { model: IncidentType, as: 'incidentType', attributes: ['type_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const rows = incidents.map(i => ({
      'Reference': i.incident_ref,
      'Title': i.title,
      'Type': i.incidentType?.type_name || '',
      'Severity': i.severity,
      'Status': i.status,
      'Risk Score': i.risk_score,
      'Risk Level': i.risk_level,
      'Reporter': i.reporter?.full_name || '',
      'Department': i.reporter?.department || '',
      'Source IP': i.source_ip || '',
      'Target IP': i.target_ip || '',
      'Affected Users': i.affected_users_count,
      'Created At': i.created_at,
      'Resolved At': i.resolved_at || ''
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sentinelx-incidents-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
};

const exportPDF = async (req, res, next) => {
  try {
    const incidents = await Incident.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['full_name'] },
        { model: IncidentType, as: 'incidentType', attributes: ['type_name'] },
        { 
          model: InvestigationNote, 
          as: 'notes', 
          include: [{ model: User, as: 'author', attributes: ['email', 'full_name'] }] 
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    const { type } = req.query;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sentinelx-report-${type || 'all'}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    let reportTitle = 'SentinelX — Incident Report';
    if (type === 'monthly') reportTitle = 'SentinelX — Monthly Security Report';
    else if (type === 'analyst') reportTitle = 'SentinelX — Analyst Performance Report';
    else if (type === 'threat') reportTitle = 'SentinelX — Threat Intelligence Report';
    else if (type === 'severity') reportTitle = 'SentinelX — Severity Distribution Report';
    else if (type === 'resolution') reportTitle = 'SentinelX — Resolution Time Report';
    else if (type === 'combined') reportTitle = 'SentinelX — Combined AI Analysis Report';

    doc.fontSize(20).fillColor('#1e293b').text(reportTitle, { align: 'center' });
    doc.fontSize(10).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary
    doc.fontSize(14).fillColor('#334155').text('Summary');
    if (type === 'combined') {
      doc.fontSize(10).fillColor('#64748b').text(`Total Incidents Processed: ${incidents.length}`);
      doc.text(`AI Analysis Status: Fully Analyzed`);
      doc.text(`Comprehensive Metrics Included.`);
    } else {
      doc.fontSize(10).fillColor('#64748b').text(`Total Incidents: ${incidents.length}`);
    }
    doc.moveDown(1);

    // Table headers
    const tableTop = doc.y;
    const cols = { ref: 40, title: 120, type: 280, severity: 370, status: 440, date: 510 };

    doc.fontSize(9).fillColor('#4f46e5');
    doc.text('REF', cols.ref, tableTop);
    doc.text('TITLE', cols.title, tableTop);
    doc.text('TYPE', cols.type, tableTop);
    doc.text('SEVERITY', cols.severity, tableTop);
    doc.text('STATUS', cols.status, tableTop);
    doc.text('DATE', cols.date, tableTop);
    doc.moveDown(0.5);

    const severityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };

    incidents.slice(0, 50).forEach((incident, i) => {
      if (doc.y > 750) { doc.addPage(); }
      const y = doc.y;
      doc.fontSize(8).fillColor('#475569');
      doc.text(incident.incident_ref, cols.ref, y, { width: 75 });
      doc.text(incident.title.substring(0, 25) + (incident.title.length > 25 ? '...' : ''), cols.title, y, { width: 155 });
      doc.text(incident.incidentType?.type_name || '-', cols.type, y, { width: 85 });
      doc.fillColor(severityColors[incident.severity] || '#64748b')
        .text(incident.severity.toUpperCase(), cols.severity, y, { width: 65 });
      doc.fillColor('#64748b').text(incident.status, cols.status, y, { width: 65 });
      doc.text(new Date(incident.created_at).toLocaleDateString(), cols.date, y, { width: 70 });
      
      // Look for AI Analysis notes
      const aiNotes = incident.notes?.filter(n => n.author?.email === 'ai_analyst@sentinelx.io') || [];
      if (aiNotes.length > 0 && (type === 'combined' || type === 'incidents')) {
        doc.moveDown(0.2);
        doc.fontSize(7).fillColor('#8b5cf6').text('↳ AI Insight: ' + aiNotes[aiNotes.length - 1].content.split('\n')[0].substring(0, 80) + '...', cols.title, doc.y, { width: 400 });
      }

      doc.moveDown(0.4);
    });

    doc.end();
  } catch (error) { next(error); }
};

module.exports = { getAnalyticsDashboard, exportCSV, exportPDF };
