const { Notification } = require('../models');

const createNotification = async ({ userId, incidentId = null, type, title, message, link = null }) => {
  try {
    return await Notification.create({
      user_id: userId,
      incident_id: incidentId,
      type,
      title,
      message,
      link
    });
  } catch (error) {
    console.error('Notification creation error:', error.message);
  }
};

const notifyIncidentAssigned = async (analystId, incident, assignedBy) => {
  return createNotification({
    userId: analystId,
    incidentId: incident.incident_id,
    type: 'incident_assigned',
    title: 'New Incident Assigned',
    message: `Incident ${incident.incident_ref}: "${incident.title}" has been assigned to you by ${assignedBy}.`,
    link: `/incidents/${incident.incident_id}`
  });
};

const notifyStatusUpdated = async (reporterId, incident, newStatus, changedBy) => {
  return createNotification({
    userId: reporterId,
    incidentId: incident.incident_id,
    type: 'status_updated',
    title: 'Incident Status Updated',
    message: `Incident ${incident.incident_ref} status changed to "${newStatus}" by ${changedBy}.`,
    link: `/incidents/${incident.incident_id}`
  });
};

const notifyIncidentResolved = async (reporterId, incident) => {
  return createNotification({
    userId: reporterId,
    incidentId: incident.incident_id,
    type: 'incident_resolved',
    title: 'Incident Resolved',
    message: `Your incident ${incident.incident_ref}: "${incident.title}" has been resolved.`,
    link: `/incidents/${incident.incident_id}`
  });
};

const notifyNoteAdded = async (reporterId, incident, analyst) => {
  return createNotification({
    userId: reporterId,
    incidentId: incident.incident_id,
    type: 'note_added',
    title: 'Investigation Note Added',
    message: `${analyst} added an investigation note to incident ${incident.incident_ref}.`,
    link: `/incidents/${incident.incident_id}`
  });
};

module.exports = {
  createNotification,
  notifyIncidentAssigned,
  notifyStatusUpdated,
  notifyIncidentResolved,
  notifyNoteAdded
};
