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

// Routes
app.get('/', (req, res) => {
  db.getAllTasks((err, tasks) => {
    if (err) {
      res.status(500).send('Error retrieving tasks');
      return;
    }
    res.render('index', { tasks });
  });
});
// Add routes for tasks: GET all tasks, POST new task
app.get('/tasks', (req, res) => {
    db.getAllTasks((err, tasks) => {
        if (err) {
            res.status(500).send('Error retrieving tasks');
            return;
        }
        res.render('index', { tasks });
    });
});

app.post('/tasks', (req, res) => {
    const { title, description, priority } = req.body;
    
    if (!title) {
        return res.status(400).send('Title is required');
    }

    db.createTask(title, description || '', priority || 'medium', (err, id) => {
        if (err) {
            return res.status(500).send('Error creating task');
        }
        res.redirect('/tasks');
    });
});



// API Routes
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Task Manager app running on http://localhost:${PORT}`);
});
