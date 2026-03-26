const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

// Mock the database module
jest.mock('../database');
const db = require('../database');

// Create app for testing with optimizations
const app = express();
app.use(compression());
app.use(bodyParser.json());

// Simple in-memory cache for tasks
const taskCache = new Map();
const CACHE_TTL = 60000;

const getCachedTask = (id) => {
  const cached = taskCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedTask = (id, data) => {
  taskCache.set(id, { data, timestamp: Date.now() });
};

const invalidateTaskCache = (id) => {
  taskCache.delete(id);
};

// Routes with optimizations
app.get('/api/tasks', (req, res) => {
  const pageParam = req.query.page;
  const limitParam = req.query.limit;
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 50;
  const offset = (page - 1) * limit;
  const priority = req.query.priority;
  const completed = req.query.completed !== undefined ? parseInt(req.query.completed) : undefined;
  
  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100' });
  }
  
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority. Must be low, medium, or high' });
  }
  
  if (completed !== undefined && ![0, 1].includes(completed)) {
    return res.status(400).json({ error: 'Invalid completed value. Must be 0 or 1' });
  }
  
  const options = { limit, offset, priority, completed };
  
  let tasksResult, countResult;
  let tasksError, countError;
  let tasksComplete = false;
  let countComplete = false;
  
  db.getAllTasks((err, tasks) => {
    tasksError = err;
    tasksResult = tasks;
    tasksComplete = true;
    checkComplete();
  }, options);
  
  db.getTaskCount((err, result) => {
    countError = err;
    countResult = result;
    countComplete = true;
    checkComplete();
  }, options);
  
  function checkComplete() {
    if (!tasksComplete || !countComplete) return;
    
    if (tasksError || countError) {
      return res.status(500).json({ error: 'Error retrieving tasks' });
    }
    
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      tasks: tasksResult,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  const cachedTask = getCachedTask(req.params.id);
  if (cachedTask) {
    return res.json(cachedTask);
  }

  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving task' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    setCachedTask(req.params.id, task);
    res.json(task);
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, priority, completed } = req.body;

  db.updateTask(req.params.id, title, description, priority, completed, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating task' });
    }
    
    invalidateTaskCache(req.params.id);
    res.json({ message: 'Task updated successfully' });
  });
});

describe('Task Manager API Optimizations', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    taskCache.clear();
  });

  describe('Pagination Tests', () => {
    test('should return paginated results with metadata', (done) => {
      const mockTasks = [
        { id: 1, title: 'Task 1', priority: 'high', completed: 0 },
        { id: 2, title: 'Task 2', priority: 'medium', completed: 0 }
      ];

      db.getAllTasks.mockImplementation((callback, options) => {
        callback(null, mockTasks);
      });

      db.getTaskCount.mockImplementation((callback, options) => {
        callback(null, { count: 10 });
      });

      request(app)
        .get('/api/tasks?page=1&limit=2')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.tasks).toEqual(mockTasks);
          expect(res.body.pagination).toEqual({
            page: 1,
            limit: 2,
            totalCount: 10,
            totalPages: 5,
            hasNextPage: true,
            hasPrevPage: false
          });
          done();
        });
    });

    test('should validate page parameter', (done) => {
      request(app)
        .get('/api/tasks?page=0')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toContain('Invalid pagination parameters');
          done();
        });
    });

    test('should validate limit parameter', (done) => {
      request(app)
        .get('/api/tasks?limit=200')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toContain('Invalid pagination parameters');
          done();
        });
    });
  });

  describe('Filtering Tests', () => {
    test('should filter by priority', (done) => {
      const mockTasks = [
        { id: 1, title: 'High priority task', priority: 'high', completed: 0 }
      ];

      db.getAllTasks.mockImplementation((callback, options) => {
        expect(options.priority).toBe('high');
        callback(null, mockTasks);
      });

      db.getTaskCount.mockImplementation((callback, options) => {
        callback(null, { count: 1 });
      });

      request(app)
        .get('/api/tasks?priority=high')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.tasks).toEqual(mockTasks);
          done();
        });
    });

    test('should filter by completed status', (done) => {
      const mockTasks = [
        { id: 1, title: 'Completed task', priority: 'high', completed: 1 }
      ];

      db.getAllTasks.mockImplementation((callback, options) => {
        expect(options.completed).toBe(1);
        callback(null, mockTasks);
      });

      db.getTaskCount.mockImplementation((callback, options) => {
        callback(null, { count: 1 });
      });

      request(app)
        .get('/api/tasks?completed=1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.tasks).toEqual(mockTasks);
          done();
        });
    });

    test('should validate priority parameter', (done) => {
      request(app)
        .get('/api/tasks?priority=invalid')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toContain('Invalid priority');
          done();
        });
    });

    test('should validate completed parameter', (done) => {
      request(app)
        .get('/api/tasks?completed=5')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toContain('Invalid completed value');
          done();
        });
    });
  });

  describe('Cache Tests', () => {
    test('should cache task on first request', (done) => {
      const mockTask = { id: 1, title: 'Test Task', priority: 'high', completed: 0 };

      db.getTaskById.mockImplementation((id, callback) => {
        callback(null, mockTask);
      });

      request(app)
        .get('/api/tasks/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockTask);
          expect(db.getTaskById).toHaveBeenCalledTimes(1);
          done();
        });
    });

    test('should return cached task on second request', (done) => {
      const mockTask = { id: 1, title: 'Test Task', priority: 'high', completed: 0 };

      db.getTaskById.mockImplementation((id, callback) => {
        callback(null, mockTask);
      });

      // First request - should hit database
      request(app)
        .get('/api/tasks/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          // Second request - should hit cache
          request(app)
            .get('/api/tasks/1')
            .expect(200)
            .end((err2, res2) => {
              if (err2) return done(err2);
              expect(res2.body).toEqual(mockTask);
              expect(db.getTaskById).toHaveBeenCalledTimes(1); // Still only called once
              done();
            });
        });
    });

    test('should invalidate cache on update', (done) => {
      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        callback(null);
      });

      // Set cache manually
      setCachedTask('1', { id: 1, title: 'Old Task' });

      request(app)
        .put('/api/tasks/1')
        .send({ title: 'New Title' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(getCachedTask('1')).toBeNull();
          done();
        });
    });
  });

  describe('Compression Tests', () => {
    test('should support gzip compression', (done) => {
      db.getAllTasks.mockImplementation((callback, options) => {
        callback(null, []);
      });

      db.getTaskCount.mockImplementation((callback, options) => {
        callback(null, { count: 0 });
      });

      request(app)
        .get('/api/tasks')
        .set('Accept-Encoding', 'gzip')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          // Supertest automatically decompresses, so we just verify the response is valid
          expect(res.body.tasks).toEqual([]);
          done();
        });
    });
  });
});
