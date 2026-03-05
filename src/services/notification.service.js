const admin = require('firebase-admin');

// Send notification to a single device
const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!fcmToken) {
      console.log('No FCM token provided, skipping notification');
      return null;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return null;
  }
};

// 1. Notify mechanic about new job request
const notifyMechanicNewJob = async (mechanicFcmToken, bookingId, customerName, location) => {
  return sendNotification(
    mechanicFcmToken,
    '🆕 New Job Request!',
    `${customerName} needs help at ${location}`,
    { bookingId, type: 'NEW_JOB_REQUEST' }
  );
};

// 2. Notify customer that mechanic accepted
const notifyCustomerAccepted = async (customerFcmToken, bookingId, mechanicName) => {
  return sendNotification(
    customerFcmToken,
    '✅ Mechanic Found!',
    `${mechanicName} has accepted your request and is on the way!`,
    { bookingId, type: 'JOB_ACCEPTED' }
  );
};

// 3. Notify customer mechanic is en route
const notifyCustomerEnRoute = async (customerFcmToken, bookingId) => {
  return sendNotification(
    customerFcmToken,
    '🚗 Mechanic is Coming!',
    'Your mechanic is heading to your location',
    { bookingId, type: 'EN_ROUTE' }
  );
};

// 4. Notify customer mechanic arrived
const notifyCustomerArrived = async (customerFcmToken, bookingId) => {
  return sendNotification(
    customerFcmToken,
    '📍 Mechanic Arrived!',
    'Your mechanic has arrived at your location',
    { bookingId, type: 'ARRIVED' }
  );
};

// 5. Notify customer repair started
const notifyCustomerRepairing = async (customerFcmToken, bookingId) => {
  return sendNotification(
    customerFcmToken,
    '🔧 Repair Started!',
    'Your mechanic has started working on your vehicle',
    { bookingId, type: 'REPAIRING' }
  );
};

// 6. Notify customer job completed
const notifyCustomerCompleted = async (customerFcmToken, bookingId) => {
  return sendNotification(
    customerFcmToken,
    '✅ Repair Complete!',
    'Your vehicle repair has been completed successfully!',
    { bookingId, type: 'COMPLETED' }
  );
};

module.exports = {
  notifyMechanicNewJob,
  notifyCustomerAccepted,
  notifyCustomerEnRoute,
  notifyCustomerArrived,
  notifyCustomerRepairing,
  notifyCustomerCompleted,
};