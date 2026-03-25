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

// Validation helpers (must be defined before routes)
const validateTaskId = (id) => {
  if (id === undefined || id === null || id === '') {
    return { valid: false, error: 'Invalid task ID' };
  }
  const numId = typeof id === 'number' ? id : parseInt(id);
  if (isNaN(numId) || numId < 1) {
    return { valid: false, error: 'Invalid task ID' };
  }
  return { valid: true };
};

const validateLabelId = (id) => {
  if (id === undefined || id === null || id === '') {
    return { valid: false, error: 'Invalid label ID' };
  }
  const numId = typeof id === 'number' ? id : parseInt(id);
  if (isNaN(numId) || numId < 1) {
    return { valid: false, error: 'Invalid label ID' };
  }
  return { valid: true };
};

const validateLabelName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Label name is required and must be a string' };
  }
  name = name.trim();
  if (name.length === 0) {
    return { valid: false, error: 'Label name cannot be empty' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Label name cannot exceed 50 characters' };
  }
  return { valid: true };
};

const validateLabelColor = (color) => {
  if (color && typeof color !== 'string') {
    return { valid: false, error: 'Label color must be a string' };
  }
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { valid: false, error: 'Label color must be a valid hex color (e.g., #FF5733)' };
  }
  return { valid: true };
};

// More specific routes must come BEFORE less specific ones
// Define bulk operations first
app.post('/api/tasks/bulk/labels', (req, res) => {
  const { assignments } = req.body;
  
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ error: 'assignments array is required and must not be empty' });
  }
  
  for (const assignment of assignments) {
    const { taskId, labelId } = assignment;
    
    const taskIdValidation = validateTaskId(taskId);
    if (!taskIdValidation.valid) {
      return res.status(400).json({ error: `Invalid task ID in assignment: ${taskId}` });
    }
    
    const labelIdValidation = validateLabelId(labelId);
    if (!labelIdValidation.valid) {
      return res.status(400).json({ error: `Invalid label ID in assignment: ${labelId}` });
    }
  }
  
  db.bulkAssignLabels(assignments, (err) => {
    if (err) {
      if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ error: 'One or more task or label IDs are invalid' });
      }
      return res.status(500).json({ error: 'Error bulk assigning labels', details: err.message });
    }
    res.json({ message: 'Labels assigned successfully to all tasks' });
  });
});

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

// Helper function to enrich tasks with labels
const enrichTasksWithLabels = (tasks, callback) => {
  if (!tasks || tasks.length === 0) {
    return callback(null, []);
  }
  
  const taskIds = tasks.map(task => task.id);
  db.getTaskLabelsOptimized(taskIds, (err, labelsByTask) => {
    if (err) {
      return callback(err);
    }
    
    const enrichedTasks = tasks.map(task => ({
      ...task,
      labels: labelsByTask[task.id] || []
    }));
    
    callback(null, enrichedTasks);
  });
};

// Label routes for tests
app.get('/api/labels', (req, res) => {
  db.getAllLabels((err, labels) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving labels', details: err.message });
    }
    res.json(labels);
  });
});

app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;
  
  const nameValidation = validateLabelName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }
  
  const colorValidation = validateLabelColor(color);
  if (!colorValidation.valid) {
    return res.status(400).json({ error: colorValidation.error });
  }
  
  db.createLabel(name.trim(), color, (err, id) => {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A label with this name already exists' });
      }
      return res.status(500).json({ error: 'Error creating label', details: err.message });
    }
    res.status(201).json({ 
      id, 
      name: name.trim(), 
      color: color || '#808080',
      created_at: new Date().toISOString()
    });
  });
});

app.post('/api/tasks/:id/labels', (req, res) => {
  const { labelId, labelIds } = req.body;
  
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }
  
  let labels = [];
  if (labelId) {
    labels = [labelId];
  } else if (labelIds && Array.isArray(labelIds)) {
    labels = labelIds;
  } else {
    return res.status(400).json({ error: 'labelId or labelIds array is required' });
  }
  
  for (const lid of labels) {
    const labelIdValidation = validateLabelId(lid);
    if (!labelIdValidation.valid) {
      return res.status(400).json({ error: `Invalid label ID: ${lid}` });
    }
  }
  
  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving task', details: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const assignments = labels.map(labelId => ({
      taskId: req.params.id,
      labelId: labelId
    }));
    
    db.bulkAssignLabels(assignments, (err) => {
      if (err) {
        if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
          return res.status(400).json({ error: 'One or more label IDs are invalid' });
        }
        return res.status(500).json({ error: 'Error assigning labels to task', details: err.message });
      }
      res.json({ message: 'Labels assigned successfully' });
    });
  });
});

app.delete('/api/tasks/:id/labels/:labelId', (req, res) => {
  const taskIdValidation = validateTaskId(req.params.id);
  if (!taskIdValidation.valid) {
    return res.status(400).json({ error: taskIdValidation.error });
  }
  
  const labelIdValidation = validateLabelId(req.params.labelId);
  if (!labelIdValidation.valid) {
    return res.status(400).json({ error: labelIdValidation.error });
  }
  
  db.removeLabelFromTask(req.params.id, req.params.labelId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error removing label from task', details: err.message });
    }
    res.json({ message: 'Label removed successfully' });
  });
});

// Update GET /api/tasks to include labels
app.get('/api/tasks', (req, res) => {
  db.getAllTasks((err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving tasks' });
    }
    enrichTasksWithLabels(tasks, (err, enrichedTasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error retrieving tasks' });
      }
      res.json(enrichedTasks);
    });
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

  // Label API Tests
  describe('Label API Routes', () => {
    
    describe('POST /api/labels - Create Label', () => {
      test('should create a label with valid name and color', (done) => {
        db.createLabel.mockImplementation((name, color, callback) => {
          callback(null, 1);
        });

        request(app)
          .post('/api/labels')
          .send({ name: 'Bug', color: '#FF0000' })
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('id', 1);
            expect(res.body).toHaveProperty('name', 'Bug');
            expect(res.body).toHaveProperty('color', '#FF0000');
            expect(db.createLabel).toHaveBeenCalledWith('Bug', '#FF0000', expect.any(Function));
            done();
          });
      });

      test('should create a label with default color when not provided', (done) => {
        db.createLabel.mockImplementation((name, color, callback) => {
          callback(null, 2);
        });

        request(app)
          .post('/api/labels')
          .send({ name: 'Feature' })
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('color', '#808080');
            done();
          });
      });

      test('should return 400 when name is missing', (done) => {
        request(app)
          .post('/api/labels')
          .send({ color: '#FF0000' })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Label name is required');
            done();
          });
      });

      test('should return 400 when color is invalid', (done) => {
        request(app)
          .post('/api/labels')
          .send({ name: 'Bug', color: 'red' })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('valid hex color');
            done();
          });
      });

      test('should return 400 when label name already exists', (done) => {
        db.createLabel.mockImplementation((name, color, callback) => {
          const error = new Error('UNIQUE constraint failed: labels.name');
          callback(error);
        });

        request(app)
          .post('/api/labels')
          .send({ name: 'Bug', color: '#FF0000' })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('already exists');
            done();
          });
      });
    });

    describe('GET /api/labels - Get All Labels', () => {
      test('should return all labels', (done) => {
        const mockLabels = [
          { id: 1, name: 'Bug', color: '#FF0000', created_at: '2024-01-01' },
          { id: 2, name: 'Feature', color: '#00FF00', created_at: '2024-01-02' }
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
            expect(db.getAllLabels).toHaveBeenCalled();
            done();
          });
      });

      test('should return 500 on database error', (done) => {
        db.getAllLabels.mockImplementation((callback) => {
          callback(new Error('Database error'));
        });

        request(app)
          .get('/api/labels')
          .expect(500)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            done();
          });
      });
    });

    describe('POST /api/tasks/:id/labels - Assign Labels to Task', () => {
      test('should assign a single label to a task', (done) => {
        db.getTaskById.mockImplementation((id, callback) => {
          callback(null, { id: 1, title: 'Test Task' });
        });
        db.bulkAssignLabels.mockImplementation((assignments, callback) => {
          callback(null);
        });

        request(app)
          .post('/api/tasks/1/labels')
          .send({ labelId: 1 })
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('message');
            expect(db.bulkAssignLabels).toHaveBeenCalledWith(
              [{ taskId: '1', labelId: 1 }],
              expect.any(Function)
            );
            done();
          });
      });

      test('should assign multiple labels to a task', (done) => {
        db.getTaskById.mockImplementation((id, callback) => {
          callback(null, { id: 1, title: 'Test Task' });
        });
        db.bulkAssignLabels.mockImplementation((assignments, callback) => {
          callback(null);
        });

        request(app)
          .post('/api/tasks/1/labels')
          .send({ labelIds: [1, 2, 3] })
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(db.bulkAssignLabels).toHaveBeenCalledWith(
              [
                { taskId: '1', labelId: 1 },
                { taskId: '1', labelId: 2 },
                { taskId: '1', labelId: 3 }
              ],
              expect.any(Function)
            );
            done();
          });
      });

      test('should return 404 when task does not exist', (done) => {
        db.getTaskById.mockImplementation((id, callback) => {
          callback(null, null);
        });

        request(app)
          .post('/api/tasks/999/labels')
          .send({ labelId: 1 })
          .expect(404)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error', 'Task not found');
            done();
          });
      });

      test('should return 400 when labelId or labelIds is missing', (done) => {
        request(app)
          .post('/api/tasks/1/labels')
          .send({})
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('labelId or labelIds');
            done();
          });
      });

      test('should return 400 when label ID is invalid', (done) => {
        db.getTaskById.mockImplementation((id, callback) => {
          callback(null, { id: 1, title: 'Test Task' });
        });
        db.bulkAssignLabels.mockImplementation((assignments, callback) => {
          const error = new Error('FOREIGN KEY constraint failed');
          callback(error);
        });

        request(app)
          .post('/api/tasks/1/labels')
          .send({ labelId: 999 })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('invalid');
            done();
          });
      });
    });

    describe('DELETE /api/tasks/:id/labels/:labelId - Remove Label from Task', () => {
      test('should remove a label from a task', (done) => {
        db.removeLabelFromTask.mockImplementation((taskId, labelId, callback) => {
          callback(null);
        });

        request(app)
          .delete('/api/tasks/1/labels/2')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('message', 'Label removed successfully');
            expect(db.removeLabelFromTask).toHaveBeenCalledWith('1', '2', expect.any(Function));
            done();
          });
      });

      test('should return 400 with invalid task ID', (done) => {
        request(app)
          .delete('/api/tasks/invalid/labels/1')
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            done();
          });
      });

      test('should return 400 with invalid label ID', (done) => {
        request(app)
          .delete('/api/tasks/1/labels/invalid')
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            done();
          });
      });
    });

    describe('POST /api/tasks/bulk/labels - Bulk Assign Labels', () => {
      test('should bulk assign labels to multiple tasks', (done) => {
        db.bulkAssignLabels.mockImplementation((assignments, callback) => {
          callback(null);
        });

        const assignments = [
          { taskId: 1, labelId: 1 },
          { taskId: 2, labelId: 1 },
          { taskId: 3, labelId: 2 }
        ];

        request(app)
          .post('/api/tasks/bulk/labels')
          .send({ assignments })
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('message');
            expect(db.bulkAssignLabels).toHaveBeenCalledWith(assignments, expect.any(Function));
            done();
          });
      });

      test('should return 400 when assignments is missing', (done) => {
        request(app)
          .post('/api/tasks/bulk/labels')
          .send({})
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('assignments array is required');
            done();
          });
      });

      test('should return 400 when assignments is empty', (done) => {
        request(app)
          .post('/api/tasks/bulk/labels')
          .send({ assignments: [] })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            done();
          });
      });

      test('should return 400 with invalid task ID in assignments', (done) => {
        request(app)
          .post('/api/tasks/bulk/labels')
          .send({ 
            assignments: [{ taskId: 'invalid', labelId: 1 }] 
          })
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Invalid task ID');
            done();
          });
      });
    });

    describe('GET /api/tasks - Tasks with Labels (Optimized)', () => {
      test('should return tasks with labels using optimized query', (done) => {
        const mockTasks = [
          { id: 1, title: 'Task 1', description: 'Desc 1' },
          { id: 2, title: 'Task 2', description: 'Desc 2' }
        ];
        
        const mockLabelsByTask = {
          1: [{ id: 1, name: 'Bug', color: '#FF0000' }],
          2: [{ id: 2, name: 'Feature', color: '#00FF00' }]
        };

        db.getAllTasks.mockImplementation((callback) => {
          callback(null, mockTasks);
        });

        db.getTaskLabelsOptimized.mockImplementation((taskIds, callback) => {
          callback(null, mockLabelsByTask);
        });

        request(app)
          .get('/api/tasks')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toHaveLength(2);
            expect(res.body[0]).toHaveProperty('labels');
            expect(res.body[0].labels).toEqual(mockLabelsByTask[1]);
            expect(res.body[1].labels).toEqual(mockLabelsByTask[2]);
            // Verify optimized query is used (single call with all task IDs)
            expect(db.getTaskLabelsOptimized).toHaveBeenCalledWith([1, 2], expect.any(Function));
            done();
          });
      });

      test('should return tasks with empty labels array when no labels assigned', (done) => {
        const mockTasks = [
          { id: 1, title: 'Task 1', description: 'Desc 1' }
        ];

        db.getAllTasks.mockImplementation((callback) => {
          callback(null, mockTasks);
        });

        db.getTaskLabelsOptimized.mockImplementation((taskIds, callback) => {
          callback(null, {}); // No labels for any task
        });

        request(app)
          .get('/api/tasks')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body[0]).toHaveProperty('labels', []);
            done();
          });
      });
    });
  });
});
