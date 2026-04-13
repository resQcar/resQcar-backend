// src/controllers/payment.controller.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// POST /api/payments/create-intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'lkr' } = req.body;
    const uid = req.user.uid;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { uid },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    // Save to Firestore so history can be filtered by user
    await db.collection('payments').doc(paymentIntent.id).set({
      paymentIntentId: paymentIntent.id,
      uid,
      amount,
      currency,
      status: paymentIntent.status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      message: 'Payment intent created successfully',
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/payments/confirm
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: 'Payment Intent ID is required' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, error: 'Payment Method ID is required' });
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully!',
        paymentStatus: paymentIntent.status,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment has not succeeded yet.',
        paymentStatus: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/payments/:id/status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Payment Intent ID is required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    return res.status(200).json({
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      message: 'Payment status retrieved successfully',
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/payments/history
exports.getPaymentHistory = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db.collection('payments')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const history = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.paymentIntentId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        date: data.createdAt ? data.createdAt.toDate().toLocaleString() : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
      message: 'Payment history retrieved successfully',
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/payments/customer-history
exports.getServiceHistoryCustomer = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db.collection('payments')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const services = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.paymentIntentId,
        amount: data.amount,
        currency: data.currency,
        date: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : null,
        status: data.status,
        description: data.description || 'Vehicle Service',
      };
    });

    return res.status(200).json({
      success: true,
      role: 'customer',
      services,
      message: 'Customer service history retrieved successfully',
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/payments/mechanic-history
exports.getServiceHistoryMechanic = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db.collection('payments')
      .where('mechanicId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const jobs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        jobId: data.paymentIntentId,
        earnings: data.amount,
        currency: data.currency,
        completedAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : null,
        status: data.status,
        customerNote: data.description || 'General Repair',
      };
    });

    return res.status(200).json({
      success: true,
      role: 'mechanic',
      jobs,
      message: 'Mechanic service history retrieved successfully',
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/payments/ratings  OR  POST /api/ratings
exports.submitRating = async (req, res) => {
  try {
    const { mechanicId, bookingId, serviceId, rating, comment } = req.body;
    const customerId = req.user.uid;

    // Accept either mechanicId (new) or serviceId (legacy)
    const resolvedMechanicId = mechanicId || serviceId;

    if (!resolvedMechanicId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'mechanicId and rating (1-5) are required',
      });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Save to Firestore ratings collection
    const ratingRef = db.collection('ratings').doc();
    const ratingData = {
      id: ratingRef.id,
      mechanicId: resolvedMechanicId,
      customerId,
      bookingId: bookingId || null,
      rating: Number(rating),
      comment: comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ratingRef.set(ratingData);

    // Update mechanic's average rating
    const mechanicRef = db.collection('mechanics').doc(resolvedMechanicId);
    await db.runTransaction(async (tx) => {
      const mechDoc = await tx.get(mechanicRef);
      if (mechDoc.exists) {
        const data = mechDoc.data();
        const count = (data.ratingCount || 0) + 1;
        const avg = ((data.ratingAvg || 0) * (count - 1) + Number(rating)) / count;
        tx.update(mechanicRef, { ratingCount: count, ratingAvg: Math.round(avg * 10) / 10 });
      }
    });

    return res.status(201).json({
      success: true,
      data: { id: ratingRef.id, ...ratingData },
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('submitRating error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/payments/mechanics/:id/ratings  OR  GET /api/ratings/mechanic/:id
exports.getMechanicRatings = async (req, res) => {
  try {
    const mechanicId = req.params.id || req.params.mechanicId;

    if (!mechanicId) {
      return res.status(400).json({ success: false, message: 'Mechanic ID is required' });
    }

    const snapshot = await db.collection('ratings')
      .where('mechanicId', '==', mechanicId)
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = [];
    snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));

    const avg = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      mechanicId,
      averageRating: avg,
      totalReviews: reviews.length,
      reviews,
      message: 'Mechanic ratings retrieved successfully',
    });
  } catch (error) {
    console.error('getMechanicRatings error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
