// src/tests/payment.test.js
const request = require('supertest');

// Mock Firebase before app loads
jest.mock('../config/firebase', () => ({
  admin: {
    firestore: {
      FieldValue: { serverTimestamp: jest.fn() },
    },
  },
  auth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
  },
  db: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        update: jest.fn().mockResolvedValue({}),
      }),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    }),
  },
  bucket: null,
}));

// Mock Stripe
jest.mock('stripe', () => () => ({
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'secret_test',
      status: 'requires_payment_method',
    }),
    confirm: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

const app = require('../app');

const AUTH_HEADER = { Authorization: 'Bearer valid-token' };

describe('POST /api/payments/create-intent', () => {
  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set(AUTH_HEADER)
      .send({ currency: 'lkr' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });
});

describe('POST /api/payments/confirm', () => {
  it('returns 400 when paymentIntentId is missing', async () => {
    const res = await request(app)
      .post('/api/payments/confirm')
      .set(AUTH_HEADER)
      .send({ paymentMethodId: 'pm_test_123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Payment Intent ID/i);
  });

  it('returns 400 when paymentMethodId is missing', async () => {
    const res = await request(app)
      .post('/api/payments/confirm')
      .set(AUTH_HEADER)
      .send({ paymentIntentId: 'pi_test_123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Payment Method ID/i);
  });
});

describe('GET /api/payments/history', () => {
  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/payments/history');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/payments/customer-history', () => {
  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/payments/customer-history');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/payments/mechanic-history', () => {
  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/payments/mechanic-history');
    expect(res.status).toBe(401);
  });
});
