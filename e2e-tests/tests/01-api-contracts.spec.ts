import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8000';

test.describe('API Contract & Health Check Suite', () => {
  test('GET / returns API service metadata with status 200 @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('name', 'Platform API');
    expect(body).toHaveProperty('status', 'online');
    expect(body).toHaveProperty('db_health', '/api/health/db');
  });

  test('GET /api/health/db returns 200 and validates database connectivity schema @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health/db`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
    expect(typeof body.timestamp).toBe('string');
  });

  test('GET /health/db alias endpoint responds with healthy status @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health/db`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('GET /api/v1/health returns ok status @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  test('GET /api/v1/ready returns readiness probe status @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/ready`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ status: 'ready' });
  });

  test('GET /non-existent-endpoint returns 404 with structured JSON error schema @api', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/non-existent-probe-endpoint`);
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });
});
