const { InvestigationNote, Incident, User } = require('../models');
const { notifyNoteAdded } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLogger');

const addNote = async (req, res, next) => {
  try {
    const { content, note_type = 'observation', is_internal = false } = req.body;
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const note = await InvestigationNote.create({
      incident_id: incident.incident_id,
      analyst_id: req.user.user_id,
      content,
      note_type,
      is_internal
    });

    // Notify reporter if different from analyst
    if (incident.reporter_id !== req.user.user_id && !is_internal) {
      await notifyNoteAdded(incident.reporter_id, incident, req.user.full_name);
    }

    await createAuditLog({
      userId: req.user.user_id, action: 'ADD_NOTE', entityType: 'note',
      entityId: note.note_id, newValues: { incident_id: incident.incident_id, note_type },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    const fullNote = await InvestigationNote.findByPk(note.note_id, {
      include: [{ model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }]
    });

    res.status(201).json({ success: true, message: 'Note added', data: fullNote });
  } catch (error) { next(error); }
};

const getNotes = async (req, res, next) => {
  try {
    const { note_type, is_internal } = req.query;
    const where = { incident_id: req.params.id };
    if (note_type) where.note_type = note_type;

    // Reporters can't see internal notes
    const userRole = req.user.role?.role_name;
    if (userRole === 'reporter') {
      where.is_internal = false;
    } else if (is_internal !== undefined) {
      where.is_internal = is_internal === 'true';
    }

    const notes = await InvestigationNote.findAll({
      where,
      include: [{ model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: notes });
  } catch (error) { next(error); }
};

const updateNote = async (req, res, next) => {
  try {
    const note = await InvestigationNote.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    // Only the author can edit
    if (note.analyst_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied: only the author can edit this note' });
    }

    const { content, note_type, is_internal } = req.body;
    await note.update({ content, note_type, is_internal });

    res.json({ success: true, message: 'Note updated', data: note });
  } catch (error) { next(error); }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await InvestigationNote.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const userRole = req.user.role?.role_name;
    if (note.analyst_id !== req.user.user_id && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await note.destroy();
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) { next(error); }
};

module.exports = { addNote, getNotes, updateNote, deleteNote };
