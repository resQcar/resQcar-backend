// src/tests/auth.test.js
const request = require('supertest');

// Mock Stripe before app loads
jest.mock('stripe', () => () => ({
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

// Mock Firebase before app loads
jest.mock('../config/firebase', () => ({
  admin: {},
  auth: {
    verifyIdToken: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
  },
  db: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
  bucket: null,
}));

const app = require('../app');

describe('POST /api/auth/register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: '123456', fullName: 'Test User' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', fullName: 'Test User' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when fullName is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
  });
});

describe('POST /api/auth/google', () => {
  it('returns 400 when idToken is missing', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/idToken/i);
  });
});

describe('POST /api/auth/send-otp', () => {
  it('returns 400 when phone is missing', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone/i);
  });

  it('returns 400 when phone has no country code', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ phone: '0771234567' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/country code/i);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('returns 400 when phone or otp is missing', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '+94771234567' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
});
