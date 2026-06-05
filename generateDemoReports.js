const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Incident, User, IncidentType, sequelize } = require('./backend/src/models');

const generateDemoReports = async () => {
  try {
    await sequelize.authenticate();
    
    // Get 2 incidents
    const incidents = await Incident.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['full_name'] },
        { model: IncidentType, as: 'incidentType', attributes: ['type_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 2
    });

    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i];
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      
      const fileName = `demo_report_incident_${incident.incident_ref}.pdf`;
      const stream = fs.createWriteStream(fileName);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).fillColor('#00f5ff').text('SentinelX — Detailed Incident Report', { align: 'center' });
      doc.fontSize(10).fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Summary
      doc.fontSize(14).fillColor('#e2e8f0').text('Incident Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#94a3b8').text(`Reference: ${incident.incident_ref}`);
      doc.text(`Title: ${incident.title}`);
      doc.text(`Type: ${incident.incidentType?.type_name || 'N/A'}`);
      doc.text(`Severity: ${incident.severity.toUpperCase()}`);
      doc.text(`Status: ${incident.status}`);
      doc.text(`Risk Score: ${incident.risk_score}`);
      doc.text(`Reporter: ${incident.reporter?.full_name || 'N/A'}`);
      doc.text(`Date: ${new Date(incident.created_at).toLocaleString()}`);
      doc.moveDown(1);
      
      // Description
      doc.fontSize(14).fillColor('#e2e8f0').text('Description & Analysis');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#94a3b8').text(incident.description);
      doc.moveDown(1);
      
      doc.fontSize(12).fillColor('#e2e8f0').text('AI Analysis Summary');
      doc.fontSize(10).fillColor('#94a3b8').text('This incident has been reviewed. Standard playbook procedures should be followed for isolation and remediation.');

      doc.end();
      
      await new Promise(resolve => stream.on('finish', resolve));
      console.log(`Generated ${fileName}`);
    }
    
    console.log('Successfully generated 2 demo reports.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

generateDemoReports();
