// src/services/notification.service.js
// =====================================================
// Push Notifications via Firebase Cloud Messaging (FCM)
// =====================================================
// Sends push notifications to customers when job status changes

const { admin } = require('../config/firebase');

/**
 * Send an FCM push notification.
 * Silently skips if no token is provided (user may not have FCM set up).
 */
async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.log(`[FCM] No token provided, skipping notification: "${title}"`);
    return null;
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: { ...data, timestamp: String(Date.now()) },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] Notification sent: ${response}`);
    return response;
  } catch (error) {
    // Don't crash the app if notification fails
    console.error(`[FCM] Failed to send notification: ${error.message}`);
    return null;
  }
}

// ── Notification helpers for each job status ──

exports.notifyCustomerAccepted = (fcmToken, jobId, mechanicName) =>
  sendNotification(
    fcmToken,
    '✅ Mechanic On The Way!',
    `${mechanicName} has accepted your request and is heading to you.`,
    { jobId, status: 'ACCEPTED' }
  );

exports.notifyCustomerEnRoute = (fcmToken, jobId) =>
  sendNotification(
    fcmToken,
    '🚗 Mechanic En Route',
    'Your mechanic is on the way to your location.',
    { jobId, status: 'EN_ROUTE' }
  );

exports.notifyCustomerArrived = (fcmToken, jobId) =>
  sendNotification(
    fcmToken,
    '📍 Mechanic Arrived',
    'Your mechanic has arrived at your location.',
    { jobId, status: 'ARRIVED' }
  );

exports.notifyCustomerRepairing = (fcmToken, jobId) =>
  sendNotification(
    fcmToken,
    '🔧 Repair In Progress',
    'Your mechanic has started working on your vehicle.',
    { jobId, status: 'REPAIRING' }
  );

exports.notifyCustomerCompleted = (fcmToken, jobId) =>
  sendNotification(
    fcmToken,
    '🎉 Job Completed',
    'Your vehicle has been repaired. Thank you for using resQcar!',
    { jobId, status: 'COMPLETED' }
  );
