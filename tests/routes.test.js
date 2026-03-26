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
  const { title, description, priority, completed, rating } = req.body;

  if (rating !== undefined) {
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }
  }

  db.updateTask(req.params.id, title, description, priority, completed, rating !== undefined ? parseInt(rating) : undefined, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating task' });
    }
    res.json({ message: 'Task updated successfully' });
  });
});

app.get('/api/tasks/:id/rating', (req, res) => {
  if (!req.params.id || isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  db.getTaskRating(req.params.id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving task rating' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ rating: result.rating });
  });
});

app.put('/api/tasks/:id/rating', (req, res) => {
  const { rating } = req.body;

  if (!req.params.id || isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  if (rating === undefined || rating === null) {
    return res.status(400).json({ error: 'Rating is required' });
  }

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 0 and 5' });
  }

  db.setTaskRating(req.params.id, ratingNum, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating task rating' });
    }
    res.json({ message: 'Task rating updated successfully' });
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

// Label routes
app.get('/api/labels', (req, res) => {
  db.getAllLabels((err, labels) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving labels' });
    }
    res.json(labels || []);
  });
});

app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Label name is required' });
  }
  db.createLabel(name.trim(), color || '#808080', (err, id) => {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'A label with this name already exists' });
      }
      return res.status(500).json({ error: 'Error creating label' });
    }
    res.status(201).json({ id, name: name.trim(), color: color || '#808080' });
  });
});

app.get('/api/labels/:id', (req, res) => {
  db.getLabelById(req.params.id, (err, label) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving label' });
    }
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json(label);
  });
});

app.delete('/api/labels/:id', (req, res) => {
  db.deleteLabel(req.params.id, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting label' });
    }
    res.json({ message: 'Label deleted successfully' });
  });
});

app.get('/api/tasks/:taskId/labels', (req, res) => {
  db.getTaskLabels(req.params.taskId, (err, labels) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving task labels' });
    }
    res.json(labels || []);
  });
});

app.post('/api/tasks/:taskId/labels/:labelId', (req, res) => {
  db.assignLabelToTask(req.params.taskId, req.params.labelId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error assigning label to task' });
    }
    res.json({ message: 'Label assigned to task successfully' });
  });
});

app.delete('/api/tasks/:taskId/labels/:labelId', (req, res) => {
  db.removeLabelFromTask(req.params.taskId, req.params.labelId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error removing label from task' });
    }
    res.json({ message: 'Label removed from task successfully' });
  });
});

app.get('/api/labels/:labelId/tasks', (req, res) => {
  db.getTasksByLabel(req.params.labelId, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving tasks by label' });
    }
    res.json(tasks || []);
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

      db.updateTask.mockImplementation((id, title, description, priority, completed, rating, callback) => {
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
            undefined,
            expect.any(Function)
          );
          done();
        });
    });

    test('should update only title', (done) => {
      const updateData = { title: 'Only title updated' };

      db.updateTask.mockImplementation((id, title, description, priority, completed, rating, callback) => {
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

      db.updateTask.mockImplementation((id, title, description, priority, completed, rating, callback) => {
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

      db.updateTask.mockImplementation((id, title, description, priority, completed, rating, callback) => {
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

      db.updateTask.mockImplementation((id, title, description, priority, completed, rating, callback) => {
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

  // GET /api/tasks/:id/rating - Get Task Rating Tests
  describe('GET /api/tasks/:id/rating - Get Task Rating', () => {
    test('should retrieve task rating', (done) => {
      db.getTaskRating.mockImplementation((id, callback) => {
        callback(null, { rating: 4 });
      });

      request(app)
        .get('/api/tasks/1/rating')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.rating).toBe(4);
          expect(db.getTaskRating).toHaveBeenCalledWith('1', expect.any(Function));
          done();
        });
    });

    test('should return 404 if task not found', (done) => {
      db.getTaskRating.mockImplementation((id, callback) => {
        callback(null, null);
      });

      request(app)
        .get('/api/tasks/999/rating')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Task not found');
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.getTaskRating.mockImplementation((id, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/tasks/1/rating')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving task rating');
          done();
        });
    });
  });

  // PUT /api/tasks/:id/rating - Set Task Rating Tests
  describe('PUT /api/tasks/:id/rating - Set Task Rating', () => {
    test('should set task rating successfully', (done) => {
      db.setTaskRating.mockImplementation((id, rating, callback) => {
        callback(null);
      });

      request(app)
        .put('/api/tasks/1/rating')
        .send({ rating: 5 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Task rating updated successfully');
          expect(db.setTaskRating).toHaveBeenCalledWith('1', 5, expect.any(Function));
          done();
        });
    });

    test('should return 400 if rating is missing', (done) => {
      request(app)
        .put('/api/tasks/1/rating')
        .send({})
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Rating is required');
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.setTaskRating.mockImplementation((id, rating, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .put('/api/tasks/1/rating')
        .send({ rating: 3 })
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error updating task rating');
          done();
        });
    });

    test('should call setTaskRating with correct parameters', (done) => {
      db.setTaskRating.mockImplementation((id, rating, callback) => {
        expect(id).toBe('2');
        expect(rating).toBe(3);
        callback(null);
      });

      request(app)
        .put('/api/tasks/2/rating')
        .send({ rating: 3 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(db.setTaskRating).toHaveBeenCalledWith('2', 3, expect.any(Function));
          done();
        });
    });

    test('should return 400 if rating is out of range', (done) => {
      request(app)
        .put('/api/tasks/1/rating')
        .send({ rating: 6 })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Rating must be between 0 and 5');
          done();
        });
    });

    test('should return 400 if rating is negative', (done) => {
      request(app)
        .put('/api/tasks/1/rating')
        .send({ rating: -1 })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Rating must be between 0 and 5');
          done();
        });
    });

    test('should accept rating of 0 to clear rating', (done) => {
      db.setTaskRating.mockImplementation((id, rating, callback) => {
        expect(rating).toBe(0);
        callback(null);
      });

      request(app)
        .put('/api/tasks/1/rating')
        .send({ rating: 0 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Task rating updated successfully');
          done();
        });
    });
  });

  // Label API Tests
  describe('GET /api/labels - Get All Labels', () => {
    test('should retrieve all labels', (done) => {
      const mockLabels = [
        { id: 1, name: 'Bug', color: '#FF0000' },
        { id: 2, name: 'Feature', color: '#00FF00' }
      ];

      db.getAllLabels.mockImplementation((callback) => {
        callback(null, mockLabels);
      });

      request(app)
        .get('/api/labels')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockLabels);
          expect(res.body.length).toBe(2);
          done();
        });
    });

    test('should return empty array if no labels exist', (done) => {
      db.getAllLabels.mockImplementation((callback) => {
        callback(null, []);
      });

      request(app)
        .get('/api/labels')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.getAllLabels.mockImplementation((callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/labels')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving labels');
          done();
        });
    });
  });

  describe('POST /api/labels - Create Label', () => {
    test('should create a label successfully', (done) => {
      db.createLabel.mockImplementation((name, color, callback) => {
        callback(null, 1);
      });

      request(app)
        .post('/api/labels')
        .send({ name: 'Bug', color: '#FF0000' })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.id).toBe(1);
          expect(res.body.name).toBe('Bug');
          expect(res.body.color).toBe('#FF0000');
          done();
        });
    });

    test('should return 400 if label name is missing', (done) => {
      request(app)
        .post('/api/labels')
        .send({ color: '#FF0000' })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Label name is required');
          done();
        });
    });

    test('should use default color if not provided', (done) => {
      db.createLabel.mockImplementation((name, color, callback) => {
        expect(color).toBe('#808080');
        callback(null, 2);
      });

      request(app)
        .post('/api/labels')
        .send({ name: 'Feature' })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.color).toBe('#808080');
          done();
        });
    });

    test('should return 409 if label name already exists', (done) => {
      db.createLabel.mockImplementation((name, color, callback) => {
        callback(new Error('UNIQUE constraint failed: labels.name'), null);
      });

      request(app)
        .post('/api/labels')
        .send({ name: 'Bug', color: '#FF0000' })
        .expect(409)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('A label with this name already exists');
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.createLabel.mockImplementation((name, color, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .post('/api/labels')
        .send({ name: 'Test', color: '#000000' })
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error creating label');
          done();
        });
    });
  });

  describe('GET /api/labels/:id - Get Label By Id', () => {
    test('should retrieve a label by id', (done) => {
      const mockLabel = { id: 1, name: 'Bug', color: '#FF0000' };

      db.getLabelById.mockImplementation((id, callback) => {
        callback(null, mockLabel);
      });

      request(app)
        .get('/api/labels/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockLabel);
          done();
        });
    });

    test('should return 404 if label not found', (done) => {
      db.getLabelById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      request(app)
        .get('/api/labels/999')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Label not found');
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.getLabelById.mockImplementation((id, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/labels/1')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving label');
          done();
        });
    });
  });

  describe('DELETE /api/labels/:id - Delete Label', () => {
    test('should delete a label successfully', (done) => {
      db.deleteLabel.mockImplementation((id, callback) => {
        callback(null);
      });

      request(app)
        .delete('/api/labels/1')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Label deleted successfully');
          expect(db.deleteLabel).toHaveBeenCalledWith('1', expect.any(Function));
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.deleteLabel.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .delete('/api/labels/1')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error deleting label');
          done();
        });
    });
  });

  describe('GET /api/tasks/:taskId/labels - Get Task Labels', () => {
    test('should retrieve labels for a task', (done) => {
      const mockLabels = [{ id: 1, name: 'Bug', color: '#FF0000' }];

      db.getTaskLabels.mockImplementation((taskId, callback) => {
        callback(null, mockLabels);
      });

      request(app)
        .get('/api/tasks/1/labels')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockLabels);
          expect(db.getTaskLabels).toHaveBeenCalledWith('1', expect.any(Function));
          done();
        });
    });

    test('should return empty array if task has no labels', (done) => {
      db.getTaskLabels.mockImplementation((taskId, callback) => {
        callback(null, []);
      });

      request(app)
        .get('/api/tasks/1/labels')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(Array.isArray(res.body)).toBe(true);
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.getTaskLabels.mockImplementation((taskId, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/tasks/1/labels')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving task labels');
          done();
        });
    });
  });

  describe('POST /api/tasks/:taskId/labels/:labelId - Assign Label to Task', () => {
    test('should assign a label to a task', (done) => {
      db.assignLabelToTask.mockImplementation((taskId, labelId, callback) => {
        callback(null);
      });

      request(app)
        .post('/api/tasks/1/labels/2')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Label assigned to task successfully');
          expect(db.assignLabelToTask).toHaveBeenCalledWith('1', '2', expect.any(Function));
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.assignLabelToTask.mockImplementation((taskId, labelId, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .post('/api/tasks/1/labels/2')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error assigning label to task');
          done();
        });
    });
  });

  describe('DELETE /api/tasks/:taskId/labels/:labelId - Remove Label from Task', () => {
    test('should remove a label from a task', (done) => {
      db.removeLabelFromTask.mockImplementation((taskId, labelId, callback) => {
        callback(null);
      });

      request(app)
        .delete('/api/tasks/1/labels/2')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.message).toBe('Label removed from task successfully');
          expect(db.removeLabelFromTask).toHaveBeenCalledWith('1', '2', expect.any(Function));
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.removeLabelFromTask.mockImplementation((taskId, labelId, callback) => {
        callback(new Error('Database error'));
      });

      request(app)
        .delete('/api/tasks/1/labels/2')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error removing label from task');
          done();
        });
    });
  });

  describe('GET /api/labels/:labelId/tasks - Get Tasks By Label', () => {
    test('should retrieve tasks for a label', (done) => {
      const mockTasks = [
        { id: 1, title: 'Task 1', priority: 'high', completed: 0 }
      ];

      db.getTasksByLabel.mockImplementation((labelId, callback) => {
        callback(null, mockTasks);
      });

      request(app)
        .get('/api/labels/1/tasks')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).toEqual(mockTasks);
          expect(db.getTasksByLabel).toHaveBeenCalledWith('1', expect.any(Function));
          done();
        });
    });

    test('should return empty array if no tasks have the label', (done) => {
      db.getTasksByLabel.mockImplementation((labelId, callback) => {
        callback(null, []);
      });

      request(app)
        .get('/api/labels/1/tasks')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(Array.isArray(res.body)).toBe(true);
          done();
        });
    });

    test('should return 500 if database fails', (done) => {
      db.getTasksByLabel.mockImplementation((labelId, callback) => {
        callback(new Error('Database error'), null);
      });

      request(app)
        .get('/api/labels/1/tasks')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).toBe('Error retrieving tasks by label');
          done();
        });
    });
  });
});
