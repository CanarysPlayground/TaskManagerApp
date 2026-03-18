const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { factorial } = require('../factorial');

// Build a minimal app for testing the factorial route
const app = express();
app.use(bodyParser.json());

app.get('/api/factorial/:n', (req, res) => {
  const n = parseInt(req.params.n, 10);
  if (isNaN(n) || n < 0 || String(n) !== req.params.n) {
    return res.status(400).json({ error: 'Input must be a non-negative integer' });
  }
  try {
    const result = factorial(n);
    res.json({ n, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

describe('Factorial utility', () => {
  test('factorial(0) should return 1', () => {
    expect(factorial(0)).toBe(1);
  });

  test('factorial(1) should return 1', () => {
    expect(factorial(1)).toBe(1);
  });

  test('factorial(5) should return 120', () => {
    expect(factorial(5)).toBe(120);
  });

  test('factorial(10) should return 3628800', () => {
    expect(factorial(10)).toBe(3628800);
  });

  test('should throw for negative numbers', () => {
    expect(() => factorial(-1)).toThrow('Input must be a non-negative integer');
  });

  test('should throw for non-integer input', () => {
    expect(() => factorial(3.5)).toThrow('Input must be a non-negative integer');
  });

  test('should throw for non-number input', () => {
    expect(() => factorial('abc')).toThrow('Input must be a non-negative integer');
  });

  test('should throw for input exceeding maximum safe value', () => {
    expect(() => factorial(19)).toThrow('Input must not exceed 18');
  });
});

describe('GET /api/factorial/:n', () => {
  test('should return factorial of 0', (done) => {
    request(app)
      .get('/api/factorial/0')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).toEqual({ n: 0, result: 1 });
        done();
      });
  });

  test('should return factorial of 5', (done) => {
    request(app)
      .get('/api/factorial/5')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).toEqual({ n: 5, result: 120 });
        done();
      });
  });

  test('should return factorial of 10', (done) => {
    request(app)
      .get('/api/factorial/10')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).toEqual({ n: 10, result: 3628800 });
        done();
      });
  });

  test('should return 400 for negative number', (done) => {
    request(app)
      .get('/api/factorial/-1')
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.error).toBeDefined();
        done();
      });
  });

  test('should return 400 for non-integer input', (done) => {
    request(app)
      .get('/api/factorial/abc')
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.error).toBeDefined();
        done();
      });
  });
});
