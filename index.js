const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Initialize database
db.initialize();

// Helper function to enrich tasks with labels
const enrichTasksWithLabels = (tasks, callback) => {
  if (!tasks || tasks.length === 0) {
    return callback(null, tasks);
  }

  let tasksWithLabels = [];
  let processedCount = 0;

  tasks.forEach((task, index) => {
    db.getTaskLabels(task.id, (err, labels) => {
      if (err) {
        console.error('Error retrieving labels for task:', err);
        tasksWithLabels[index] = { ...task, labels: [] };
      } else {
        tasksWithLabels[index] = { ...task, labels: labels || [] };
      }
      processedCount++;
      if (processedCount === tasks.length) {
        callback(null, tasksWithLabels);
      }
    });
  });
};

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

const validateRating = (rating) => {
  if (rating !== undefined && rating !== null) {
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      return { valid: false, error: 'Rating must be between 0 and 5' };
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

const validateColor = (color) => {
  if (color && typeof color !== 'string') {
    return { valid: false, error: 'Color must be a string' };
  }
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { valid: false, error: 'Color must be a valid hex color (e.g., #FF5733)' };
  }
  return { valid: true };
};

const validateLabelId = (id) => {
  if (!id || isNaN(parseInt(id))) {
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
    db.getAllLabels((err, labels) => {
      if (err) {
        console.error('Error retrieving labels:', err);
        labels = [];
      }
      enrichTasksWithLabels(tasks, (err, enrichedTasks) => {
        if (err) {
          console.error('Error enriching tasks:', err);
          enrichedTasks = tasks;
        }
        res.render('index', { tasks: enrichedTasks, labels: labels || [] });
      });
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
    enrichTasksWithLabels([task], (err, enrichedTasks) => {
      if (err) {
        return res.json(task);
      }
      res.json(enrichedTasks[0]);
    });
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, priority, completed, rating } = req.body;

  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  // Validate at least one field is provided
  if (!title && !description && !priority && completed === undefined && rating === undefined) {
    return res.status(400).json({ error: 'At least one field (title, description, priority, completed, or rating) must be provided' });
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

  // Validate rating if provided
  if (rating !== undefined) {
    const ratingValidation = validateRating(rating);
    if (!ratingValidation.valid) {
      return res.status(400).json({ error: ratingValidation.error });
    }
  }

  db.updateTask(req.params.id, title, description, priority, completed, rating !== undefined ? parseInt(rating) : undefined, (err) => {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Error updating task', details: err.message });
    }
    res.json({ message: 'Task updated successfully' });
  });
});

app.get('/api/tasks/:id/rating', (req, res) => {
  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  db.getTaskRating(req.params.id, (err, result) => {
    if (err) {
      console.error('Error retrieving task rating:', err);
      return res.status(500).json({ error: 'Error retrieving task rating', details: err.message });
    }
    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ rating: result.rating });
  });
});

app.put('/api/tasks/:id/rating', (req, res) => {
  const { rating } = req.body;

  // Validate task ID
  const idValidation = validateTaskId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  // Validate rating is provided
  if (rating === undefined || rating === null) {
    return res.status(400).json({ error: 'Rating is required' });
  }

  // Validate rating value
  const ratingValidation = validateRating(rating);
  if (!ratingValidation.valid) {
    return res.status(400).json({ error: ratingValidation.error });
  }

  db.setTaskRating(req.params.id, parseInt(rating), (err) => {
    if (err) {
      console.error('Error updating task rating:', err);
      return res.status(500).json({ error: 'Error updating task rating', details: err.message });
    }
    res.json({ message: 'Task rating updated successfully' });
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

// Label API Routes
// Get all labels
app.get('/api/labels', (req, res) => {
  db.getAllLabels((err, labels) => {
    if (err) {
      console.error('Error retrieving labels:', err);
      return res.status(500).json({ error: 'Error retrieving labels', details: err.message });
    }
    res.json(labels || []);
  });
});

// Create a new label
app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;

  // Validate name
  const nameValidation = validateLabelName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validate color
  const colorValidation = validateColor(color);
  if (!colorValidation.valid) {
    return res.status(400).json({ error: colorValidation.error });
  }

  db.createLabel(name.trim(), color || '#808080', (err, id) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'A label with this name already exists' });
      }
      console.error('Error creating label:', err);
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

// Get a specific label
app.get('/api/labels/:id', (req, res) => {
  // Validate label ID
  const idValidation = validateLabelId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  db.getLabelById(req.params.id, (err, label) => {
    if (err) {
      console.error('Error retrieving label:', err);
      return res.status(500).json({ error: 'Error retrieving label', details: err.message });
    }
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json(label);
  });
});

// Update a label
app.put('/api/labels/:id', (req, res) => {
  const { name, color } = req.body;

  // Validate label ID
  const idValidation = validateLabelId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  // Validate at least one field is provided
  if (name === undefined && color === undefined) {
    return res.status(400).json({ error: 'At least one field (name or color) must be provided' });
  }

  // Validate name if provided
  if (name !== undefined) {
    const nameValidation = validateLabelName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }
  }

  // Validate color if provided
  if (color !== undefined) {
    const colorValidation = validateColor(color);
    if (!colorValidation.valid) {
      return res.status(400).json({ error: colorValidation.error });
    }
  }

  db.updateLabel(req.params.id, name ? name.trim() : undefined, color, (err) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'A label with this name already exists' });
      }
      console.error('Error updating label:', err);
      return res.status(500).json({ error: 'Error updating label', details: err.message });
    }
    res.json({ message: 'Label updated successfully' });
  });
});

// Delete a label
app.delete('/api/labels/:id', (req, res) => {
  // Validate label ID
  const idValidation = validateLabelId(req.params.id);
  if (!idValidation.valid) {
    return res.status(400).json({ error: idValidation.error });
  }

  db.deleteLabel(req.params.id, (err) => {
    if (err) {
      console.error('Error deleting label:', err);
      return res.status(500).json({ error: 'Error deleting label', details: err.message });
    }
    res.json({ message: 'Label deleted successfully' });
  });
});

// Get labels for a specific task
app.get('/api/tasks/:taskId/labels', (req, res) => {
  // Validate task ID
  const taskIdValidation = validateTaskId(req.params.taskId);
  if (!taskIdValidation.valid) {
    return res.status(400).json({ error: taskIdValidation.error });
  }

  db.getTaskLabels(req.params.taskId, (err, labels) => {
    if (err) {
      console.error('Error retrieving task labels:', err);
      return res.status(500).json({ error: 'Error retrieving task labels', details: err.message });
    }
    res.json(labels || []);
  });
});

// Assign a label to a task
app.post('/api/tasks/:taskId/labels/:labelId', (req, res) => {
  // Validate task ID
  const taskIdValidation = validateTaskId(req.params.taskId);
  if (!taskIdValidation.valid) {
    return res.status(400).json({ error: taskIdValidation.error });
  }

  // Validate label ID
  const labelIdValidation = validateLabelId(req.params.labelId);
  if (!labelIdValidation.valid) {
    return res.status(400).json({ error: labelIdValidation.error });
  }

  db.assignLabelToTask(req.params.taskId, req.params.labelId, (err) => {
    if (err) {
      console.error('Error assigning label to task:', err);
      return res.status(500).json({ error: 'Error assigning label to task', details: err.message });
    }
    res.json({ message: 'Label assigned to task successfully' });
  });
});

// Remove a label from a task
app.delete('/api/tasks/:taskId/labels/:labelId', (req, res) => {
  // Validate task ID
  const taskIdValidation = validateTaskId(req.params.taskId);
  if (!taskIdValidation.valid) {
    return res.status(400).json({ error: taskIdValidation.error });
  }

  // Validate label ID
  const labelIdValidation = validateLabelId(req.params.labelId);
  if (!labelIdValidation.valid) {
    return res.status(400).json({ error: labelIdValidation.error });
  }

  db.removeLabelFromTask(req.params.taskId, req.params.labelId, (err) => {
    if (err) {
      console.error('Error removing label from task:', err);
      return res.status(500).json({ error: 'Error removing label from task', details: err.message });
    }
    res.json({ message: 'Label removed from task successfully' });
  });
});

// Get tasks by label
app.get('/api/labels/:labelId/tasks', (req, res) => {
  // Validate label ID
  const labelIdValidation = validateLabelId(req.params.labelId);
  if (!labelIdValidation.valid) {
    return res.status(400).json({ error: labelIdValidation.error });
  }

  db.getTasksByLabel(req.params.labelId, (err, tasks) => {
    if (err) {
      console.error('Error retrieving tasks by label:', err);
      return res.status(500).json({ error: 'Error retrieving tasks by label', details: err.message });
    }
    if (!tasks || tasks.length === 0) {
      return res.json([]);
    }
    enrichTasksWithLabels(tasks, (err, enrichedTasks) => {
      if (err) {
        console.error('Error enriching tasks with labels:', err);
        return res.json(tasks);
      }
      res.json(enrichedTasks);
    });
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
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task Manager app running on http://localhost:${PORT}`);
  });
}

module.exports = { app, enrichTasksWithLabels };
