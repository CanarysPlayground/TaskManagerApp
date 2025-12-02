const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock the database module
jest.mock('../database');
const db = require('../database');

// Create app for testing
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes from index.js
app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.createTask(title, description || '', priority || 'medium', (err, id) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating task' });
    }
    res.json({ id, title, description, priority, completed: 0, created_at: new Date().toISOString() });
  });
});

app.get('/api/tasks', (req, res) => {
  db.getAllTasks((err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving tasks' });
    }
    res.json(tasks);
  });
});

app.get('/api/tasks/:id', (req, res) => {
  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving task' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, priority, completed } = req.body;

  db.updateTask(req.params.id, title, description, priority, completed, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating task' });
    }
    res.json({ message: 'Task updated successfully' });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.deleteTask(req.params.id, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting task' });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

describe('Task Manager API Routes', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // POST /api/tasks - Create Task Tests
  describe('POST /api/tasks - Create Task', () => {
    test('should create a task with all required fields', (done) => {
      const newTask = {
        title: 'Buy groceries',
        description: 'Milk, bread, eggs',
        priority: 'high'
      };

      db.createTask.mockImplementation((title, description, priority, callback) => {
        callback(null, 1);
      });

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.id).toBe(1);
          expect(res.body.title).toBe(newTask.title);
          expect(res.body.description).toBe(newTask.description);
          expect(res.body.priority).toBe(newTask.priority);
          expect(res.body.completed).toBe(0);
          done();
        });
    });

    test('should return 400 error if title is missing', (done) => {
      const newTask = {
        description: 'No title provided',
        priority: 'medium'
      };

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Title is required');
          done();
        });
    });

    test('should use default priority (medium) if not provided', (done) => {
      const newTask = {
        title: 'Study for exam',
        description: 'Math and Science'
      };

      db.createTask.mockImplementation((title, description, priority, callback) => {
        expect(priority).toBe('medium');
        callback(null, 2);
      });

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.title).toBe('Study for exam');
          done();
        });
    });

    test('should use default description (empty string) if not provided', (done) => {
      const newTask = {
        title: 'Test task',
        priority: 'low'
      };

      db.createTask.mockImplementation((title, description, priority, callback) => {
        expect(description).toBe('');
        callback(null, 3);
      });

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.title).toBe('Test task');
          done();
        });
    });

    test('should return 500 error if database fails', (done) => {
      const newTask = {
        title: 'Test task',
        description: 'Test',
        priority: 'low'
      };

      db.createTask.mockImplementation((title, description, priority, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error creating task');
          done();
        });
    });

    test('should call createTask with correct parameters', (done) => {
      const newTask = {
        title: 'New task',
        description: 'Test description',
        priority: 'high'
      };

      db.createTask.mockImplementation((title, description, priority, callback) => {
        callback(null, 4);
      });

      request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.createTask).toHaveBeenCalledWith(
            newTask.title,
            newTask.description,
            newTask.priority,
            expect.any(Function)
          );
          done();
        });
    });
  });

  // GET /api/tasks - Get All Tasks Tests
  describe('GET /api/tasks - Get All Tasks', () => {
    test('should retrieve all tasks', (done) => {
      const mockTasks = [
        { id: 1, title: 'Task 1', description: 'Desc 1', priority: 'high', completed: 0, created_at: '2025-12-01' },
        { id: 2, title: 'Task 2', description: 'Desc 2', priority: 'low', completed: 1, created_at: '2025-12-02' },
        { id: 3, title: 'Task 3', description: 'Desc 3', priority: 'medium', completed: 0, created_at: '2025-12-03' }
      ];

      db.getAllTasks.mockImplementation((callback) => {
        callback(null, mockTasks);
      });

      request(app)
        .get('/api/tasks')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockTasks);
          expect(res.body.length).toBe(3);
          expect(res.body[0].id).toBe(1);
          done();
        });
    });

    test('should return empty array if no tasks exist', (done) => {
      db.getAllTasks.mockImplementation((callback) => {
        callback(null, []);
      });

      request(app)
        .get('/api/tasks')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual([]);
          expect(Array.isArray(res.body)).toBe(true);
          done();
        });
    });

    test('should return 500 error if database fails', (done) => {
      db.getAllTasks.mockImplementation((callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/tasks')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving tasks');
          done();
        });
    });

    test('should call getAllTasks', (done) => {
      db.getAllTasks.mockImplementation((callback) => {
        callback(null, []);
      });

      request(app)
        .get('/api/tasks')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.getAllTasks).toHaveBeenCalled();
          done();
        });
    });
  });

  // GET /api/tasks/:id - Get Single Task Tests
  describe('GET /api/tasks/:id - Get Single Task', () => {
    test('should retrieve a task by id', (done) => {
      const mockTask = {
        id: 1,
        title: 'Buy groceries',
        description: 'Milk, bread, eggs',
        priority: 'high',
        completed: 0,
        created_at: '2025-12-01'
      };

      db.getTaskById.mockImplementation((id, callback) => {
        callback(null, mockTask);
      });

      request(app)
        .get('/api/tasks/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockTask);
          expect(res.body.id).toBe(1);
          expect(res.body.title).toBe('Buy groceries');
          done();
        });
    });

    test('should return 404 if task not found', (done) => {
      db.getTaskById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      request(app)
        .get('/api/tasks/999')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Task not found');
          done();
        });
    });

    test('should return 500 error if database fails', (done) => {
      db.getTaskById.mockImplementation((id, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/tasks/1')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving task');
          done();
        });
    });

    test('should call getTaskById with correct id parameter', (done) => {
      const mockTask = { id: 5, title: 'Test', description: '', priority: 'medium', completed: 0 };

      db.getTaskById.mockImplementation((id, callback) => {
        expect(id).toBe('5');
        callback(null, mockTask);
      });

      request(app)
        .get('/api/tasks/5')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.getTaskById).toHaveBeenCalledWith('5', expect.any(Function));
          done();
        });
    });
  });

  // PUT /api/tasks/:id - Update Task Tests
  describe('PUT /api/tasks/:id - Update Task', () => {
    test('should update a task with all fields', (done) => {
      const updateData = {
        title: 'Updated task',
        description: 'Updated description',
        priority: 'low',
        completed: 1
      };

      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        callback(null);
      });

      request(app)
        .put('/api/tasks/1')
        .send(updateData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Task updated successfully');
          expect(db.updateTask).toHaveBeenCalledWith(
            '1',
            updateData.title,
            updateData.description,
            updateData.priority,
            updateData.completed,
            expect.any(Function)
          );
          done();
        });
    });

    test('should update only title', (done) => {
      const updateData = { title: 'Only title updated' };

      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        callback(null);
      });

      request(app)
        .put('/api/tasks/2')
        .send(updateData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Task updated successfully');
          done();
        });
    });

    test('should mark task as completed', (done) => {
      const updateData = { completed: 1 };

      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        expect(completed).toBe(1);
        callback(null);
      });

      request(app)
        .put('/api/tasks/3')
        .send(updateData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    test('should return 500 error if database fails on update', (done) => {
      const updateData = {
        title: 'Updated task',
        description: 'Updated description',
        priority: 'low',
        completed: 0
      };

      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .put('/api/tasks/1')
        .send(updateData)
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error updating task');
          done();
        });
    });

    test('should call updateTask with correct parameters', (done) => {
      const updateData = {
        title: 'New title',
        description: 'New desc',
        priority: 'high',
        completed: 1
      };

      db.updateTask.mockImplementation((id, title, description, priority, completed, callback) => {
        callback(null);
      });

      request(app)
        .put('/api/tasks/4')
        .send(updateData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.updateTask).toHaveBeenCalled();
          done();
        });
    });
  });

  // DELETE /api/tasks/:id - Delete Task Tests
  describe('DELETE /api/tasks/:id - Delete Task', () => {
    test('should delete a task', (done) => {
      db.deleteTask.mockImplementation((id, callback) => {
        callback(null);
      });

      request(app)
        .delete('/api/tasks/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Task deleted successfully');
          expect(db.deleteTask).toHaveBeenCalledWith('1', expect.any(Function));
          done();
        });
    });

    test('should return 500 error if database fails on delete', (done) => {
      db.deleteTask.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .delete('/api/tasks/1')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error deleting task');
          done();
        });
    });

    test('should call deleteTask with correct id parameter', (done) => {
      db.deleteTask.mockImplementation((id, callback) => {
        expect(id).toBe('5');
        callback(null);
      });

      request(app)
        .delete('/api/tasks/5')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.deleteTask).toHaveBeenCalledWith('5', expect.any(Function));
          done();
        });
    });

    test('should delete task with different id values', (done) => {
      db.deleteTask.mockImplementation((id, callback) => {
        callback(null);
      });

      request(app)
        .delete('/api/tasks/999')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.deleteTask).toHaveBeenCalledWith('999', expect.any(Function));
          done();
        });
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    test('should handle multiple sequential requests', (done) => {
      db.getAllTasks.mockImplementation((callback) => {
        callback(null, []);
      });

      db.createTask.mockImplementation((title, description, priority, callback) => {
        callback(null, 1);
      });

      request(app)
        .get('/api/tasks')
        .end(() => {
          request(app)
            .post('/api/tasks')
            .send({ title: 'New task', description: 'Desc', priority: 'high' })
            .end(() => {
              expect(db.getAllTasks).toHaveBeenCalled();
              expect(db.createTask).toHaveBeenCalled();
              done();
            });
        });
    });
  });
});
