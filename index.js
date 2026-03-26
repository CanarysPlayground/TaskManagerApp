const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const db = require('./database');

const app = express();

// Simple in-memory cache for tasks
const taskCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

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

const clearTaskCache = () => {
  taskCache.clear();
};

// Middleware
app.use(compression()); // Enable gzip compression for responses
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Initialize database
db.initialize();

// Validation helpers
const validateTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required and must be a string' };
  }
  title = title.trim();
  if (title.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }
  if (title.length > 255) {
    return { valid: false, error: 'Title cannot exceed 255 characters' };
  }
  return { valid: true };
};

const validateDescription = (description) => {
  if (description && typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }
  if (description && description.length > 1000) {
    return { valid: false, error: 'Description cannot exceed 1000 characters' };
  }
  return { valid: true };
};

const validatePriority = (priority) => {
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return { valid: false, error: 'Priority must be low, medium, or high' };
  }
  return { valid: true };
};

const validateCompleted = (completed) => {
  if (completed !== undefined && completed !== null) {
    if (![0, 1, '0', '1'].includes(completed)) {
      return { valid: false, error: 'Completed must be 0 or 1' };
    }
  }
  return { valid: true };
};

const validateTaskId = (id) => {
  if (!id || isNaN(parseInt(id))) {
    return { valid: false, error: 'Invalid task ID' };
  }
  return { valid: true };
};

// Routes
app.get('/', (req, res) => {
  db.getAllTasks((err, tasks) => {
    if (err) {
      console.error('Error retrieving tasks:', err);
      res.status(500).render('error', { message: 'Error retrieving tasks' });
      return;
    }
    res.render('index', { tasks });
  });
});

// Add routes for tasks: GET all tasks, POST new task
app.get('/tasks', (req, res) => {
    db.getAllTasks((err, tasks) => {
        if (err) {
            console.error('Error retrieving tasks:', err);
            res.status(500).render('error', { message: 'Error retrieving tasks' });
            return;
        }
        res.render('index', { tasks });
    });
});

app.post('/tasks', (req, res) => {
    const { title, description, priority } = req.body;
    
    // Validate title
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
        return res.status(400).render('error', { message: titleValidation.error });
    }

    // Validate description
    const descriptionValidation = validateDescription(description);
    if (!descriptionValidation.valid) {
        return res.status(400).render('error', { message: descriptionValidation.error });
    }

    // Validate priority
    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
        return res.status(400).render('error', { message: priorityValidation.error });
    }

    db.createTask(title.trim(), description ? description.trim() : '', priority || 'medium', (err, id) => {
        if (err) {
            console.error('Error creating task:', err);
            return res.status(500).render('error', { message: 'Error creating task' });
        }
        res.redirect('/tasks');
    });
});



// API Routes
app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;
  
  // Validate title
  const titleValidation = validateTitle(title);
  if (!titleValidation.valid) {
    return res.status(400).json({ error: titleValidation.error });
  }

  // Validate description
  const descriptionValidation = validateDescription(description);
  if (!descriptionValidation.valid) {
    return res.status(400).json({ error: descriptionValidation.error });
  }

  // Validate priority
  const priorityValidation = validatePriority(priority);
  if (!priorityValidation.valid) {
    return res.status(400).json({ error: priorityValidation.error });
  }

  db.createTask(title.trim(), description ? description.trim() : '', priority || 'medium', (err, id) => {
    if (err) {
      console.error('Error creating task:', err);
      return res.status(500).json({ error: 'Error creating task', details: err.message });
    }
    
    // Clear cache when new task is created
    clearTaskCache();
    
    res.status(201).json({ 
      id, 
      title: title.trim(), 
      description: description ? description.trim() : '', 
      priority: priority || 'medium', 
      completed: 0, 
      created_at: new Date().toISOString() 
    });
  });
});

app.get('/api/tasks', (req, res) => {
  // Parse query parameters for pagination and filtering
  const pageParam = req.query.page;
  const limitParam = req.query.limit;
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 50;
  const offset = (page - 1) * limit;
  const priority = req.query.priority;
  const completed = req.query.completed !== undefined ? parseInt(req.query.completed) : undefined;
  
  // Validate pagination parameters
  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100' });
  }
  
  // Validate priority if provided
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority. Must be low, medium, or high' });
  }
  
  // Validate completed if provided
  if (completed !== undefined && ![0, 1].includes(completed)) {
    return res.status(400).json({ error: 'Invalid completed value. Must be 0 or 1' });
  }
  
  const options = { limit, offset, priority, completed };
  
  // Get tasks and total count in parallel
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
      // Log both errors if both exist
      if (tasksError && countError) {
        console.error('Error retrieving tasks:', tasksError);
        console.error('Error retrieving task count:', countError);
      } else {
        console.error('Error retrieving tasks:', tasksError || countError);
      }
      
      // Return the first error that occurred
      const error = tasksError || countError;
      return res.status(500).json({ error: 'Error retrieving tasks', details: error.message });
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
  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  // Check cache first
  const cachedTask = getCachedTask(req.params.id);
  if (cachedTask) {
    return res.json(cachedTask);
  }

  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      console.error('Error retrieving task:', err);
      return res.status(500).json({ error: 'Error retrieving task', details: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Cache the task
    setCachedTask(req.params.id, task);
    res.json(task);
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, priority, completed } = req.body;

  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  // Validate at least one field is provided
  if (!title && !description && !priority && completed === undefined) {
    return res.status(400).json({ error: 'At least one field (title, description, priority, or completed) must be provided' });
  }

  // Validate title if provided
  if (title !== undefined) {
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      return res.status(400).json({ error: titleValidation.error });
    }
  }

  // Validate description if provided
  if (description !== undefined) {
    const descriptionValidation = validateDescription(description);
    if (!descriptionValidation.valid) {
      return res.status(400).json({ error: descriptionValidation.error });
    }
  }

  // Validate priority if provided
  if (priority !== undefined) {
    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
      return res.status(400).json({ error: priorityValidation.error });
    }
  }

  // Validate completed if provided
  if (completed !== undefined) {
    const completedValidation = validateCompleted(completed);
    if (!completedValidation.valid) {
      return res.status(400).json({ error: completedValidation.error });
    }
  }

  db.updateTask(req.params.id, title, description, priority, completed, (err) => {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Error updating task', details: err.message });
    }
    
    // Invalidate cache for this task
    invalidateTaskCache(req.params.id);
    
    res.json({ message: 'Task updated successfully' });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  db.deleteTask(req.params.id, (err) => {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ error: 'Error deleting task', details: err.message });
    }
    
    // Invalidate cache for this task
    invalidateTaskCache(req.params.id);
    
    res.json({ message: 'Task deleted successfully' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Task Manager app running on http://localhost:${PORT}`);
});
