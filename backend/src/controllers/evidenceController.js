const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Evidence, Incident, User } = require('../models');
const { createAuditLog } = require('../middleware/auditLogger');

const uploadEvidence = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    // Calculate MD5 hash of file
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    const evidence = await Evidence.create({
      incident_id: incident.incident_id,
      uploaded_by: req.user.user_id,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      description: req.body.description || null,
      hash_md5: hash
    });

    await createAuditLog({
      userId: req.user.user_id, action: 'UPLOAD_EVIDENCE', entityType: 'evidence',
      entityId: evidence.evidence_id, newValues: { incident_id: incident.incident_id, file: req.file.originalname },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    const fullEvidence = await Evidence.findByPk(evidence.evidence_id, {
      include: [{ model: User, as: 'uploader', attributes: ['user_id', 'full_name'] }]
    });

    res.status(201).json({ success: true, message: 'Evidence uploaded', data: fullEvidence });
  } catch (error) { next(error); }
};

const getEvidence = async (req, res, next) => {
  try {
    const evidence = await Evidence.findAll({
      where: { incident_id: req.params.id },
      include: [{ model: User, as: 'uploader', attributes: ['user_id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: evidence });
  } catch (error) { next(error); }
};

const deleteEvidence = async (req, res, next) => {
  try {
    const evidence = await Evidence.findByPk(req.params.evidenceId);
    if (!evidence) return res.status(404).json({ success: false, message: 'Evidence not found' });

    const userRole = req.user.role?.role_name;
    if (evidence.uploaded_by !== req.user.user_id && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete file from disk
    if (fs.existsSync(evidence.file_path)) {
      fs.unlinkSync(evidence.file_path);
    }

    await evidence.destroy();
    res.json({ success: true, message: 'Evidence deleted' });
  } catch (error) { next(error); }
};

const downloadEvidence = async (req, res, next) => {
  try {
    const evidence = await Evidence.findByPk(req.params.evidenceId);
    if (!evidence) return res.status(404).json({ success: false, message: 'Evidence not found' });

    if (!fs.existsSync(evidence.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${evidence.original_name}"`);
    res.setHeader('Content-Type', evidence.file_type);
    res.sendFile(path.resolve(evidence.file_path));
  } catch (error) { next(error); }
};

module.exports = { uploadEvidence, getEvidence, deleteEvidence, downloadEvidence };
