const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();

// Helper function to enrich tasks with labels in a single optimized query
// Avoids N+1 query problem by batching label fetches
const enrichTasksWithLabels = (tasks, callback) => {
  if (!tasks || tasks.length === 0) {
    return callback(null, []);
  }
  
  const taskIds = tasks.map(task => task.id);
  db.getTaskLabelsOptimized(taskIds, (err, labelsByTask) => {
    if (err) {
      return callback(err);
    }
    
    // Attach labels to each task
    const enrichedTasks = tasks.map(task => ({
      ...task,
      labels: labelsByTask[task.id] || []
    }));
    
    callback(null, enrichedTasks);
  });
};

// Middleware
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
  if (id === undefined || id === null || id === '') {
    return { valid: false, error: 'Invalid task ID' };
  }
  const numId = typeof id === 'number' ? id : parseInt(id);
  if (isNaN(numId) || numId < 1) {
    return { valid: false, error: 'Invalid task ID' };
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

// Routes
app.get('/', (req, res) => {
  db.getAllTasks((err, tasks) => {
    if (err) {
      console.error('Error retrieving tasks:', err);
      res.status(500).render('error', { message: 'Error retrieving tasks' });
      return;
    }
    // Enrich tasks with labels using optimized batch query
    enrichTasksWithLabels(tasks, (err, enrichedTasks) => {
      if (err) {
        console.error('Error enriching tasks with labels:', err);
        res.status(500).render('error', { message: 'Error retrieving tasks' });
        return;
      }
      res.render('index', { tasks: enrichedTasks });
    });
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
  db.getAllTasks((err, tasks) => {
    if (err) {
      console.error('Error retrieving tasks:', err);
      return res.status(500).json({ error: 'Error retrieving tasks', details: err.message });
    }
    // Enrich tasks with labels using optimized batch query
    enrichTasksWithLabels(tasks, (err, enrichedTasks) => {
      if (err) {
        console.error('Error enriching tasks with labels:', err);
        return res.status(500).json({ error: 'Error retrieving tasks', details: err.message });
      }
      res.json(enrichedTasks);
    });
  });
});

app.get('/api/tasks/:id', (req, res) => {
  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      console.error('Error retrieving task:', err);
      return res.status(500).json({ error: 'Error retrieving task', details: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
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
    res.json({ message: 'Task deleted successfully' });
  });
});

// Label Routes

// GET all labels
app.get('/api/labels', (req, res) => {
  db.getAllLabels((err, labels) => {
    if (err) {
      console.error('Error retrieving labels:', err);
      return res.status(500).json({ error: 'Error retrieving labels', details: err.message });
    }
    res.json(labels);
  });
});

// POST create a new label
app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;
  
  // Validate label name
  const nameValidation = validateLabelName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }
  
  // Validate color if provided
  const colorValidation = validateLabelColor(color);
  if (!colorValidation.valid) {
    return res.status(400).json({ error: colorValidation.error });
  }
  
  db.createLabel(name.trim(), color, (err, id) => {
    if (err) {
      console.error('Error creating label:', err);
      // Handle unique constraint violation
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

// POST assign label(s) to a task
app.post('/api/tasks/:id/labels', (req, res) => {
  const { labelId, labelIds } = req.body;
  
  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }
  
  // Support both single label and multiple labels
  let labels = [];
  if (labelId) {
    labels = [labelId];
  } else if (labelIds && Array.isArray(labelIds)) {
    labels = labelIds;
  } else {
    return res.status(400).json({ error: 'labelId or labelIds array is required' });
  }
  
  // Validate all label IDs
  for (const lid of labels) {
    const labelIdValidation = validateLabelId(lid);
    if (!labelIdValidation.valid) {
      return res.status(400).json({ error: `Invalid label ID: ${lid}` });
    }
  }
  
  // First verify the task exists
  db.getTaskById(req.params.id, (err, task) => {
    if (err) {
      console.error('Error retrieving task:', err);
      return res.status(500).json({ error: 'Error retrieving task', details: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Prepare assignments for bulk operation
    const assignments = labels.map(labelId => ({
      taskId: req.params.id,
      labelId: labelId
    }));
    
    db.bulkAssignLabels(assignments, (err) => {
      if (err) {
        console.error('Error assigning labels to task:', err);
        // Handle foreign key constraint violation
        if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
          return res.status(400).json({ error: 'One or more label IDs are invalid' });
        }
        return res.status(500).json({ error: 'Error assigning labels to task', details: err.message });
      }
      res.json({ message: 'Labels assigned successfully' });
    });
  });
});

// DELETE remove a label from a task
app.delete('/api/tasks/:id/labels/:labelId', (req, res) => {
  // Validate task ID
  const taskIdValidation = validateTaskId(req.params.id);
  if (!taskIdValidation.valid) {
    return res.status(400).json({ error: taskIdValidation.error });
  }
  
  // Validate label ID
  const labelIdValidation = validateLabelId(req.params.labelId);
  if (!labelIdValidation.valid) {
    return res.status(400).json({ error: labelIdValidation.error });
  }
  
  db.removeLabelFromTask(req.params.id, req.params.labelId, (err) => {
    if (err) {
      console.error('Error removing label from task:', err);
      return res.status(500).json({ error: 'Error removing label from task', details: err.message });
    }
    res.json({ message: 'Label removed successfully' });
  });
});

// POST bulk assign labels to multiple tasks
app.post('/api/tasks/bulk/labels', (req, res) => {
  const { assignments } = req.body;
  
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ error: 'assignments array is required and must not be empty' });
  }
  
  // Validate all assignments
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
      console.error('Error bulk assigning labels:', err);
      // Handle foreign key constraint violation
      if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ error: 'One or more task or label IDs are invalid' });
      }
      return res.status(500).json({ error: 'Error bulk assigning labels', details: err.message });
    }
    res.json({ message: 'Labels assigned successfully to all tasks' });
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
