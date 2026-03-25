const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'tasks.db'));

const initialize = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create labels table
    db.run(`
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#808080',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create task_labels junction table for many-to-many relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, label_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for optimal query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id)`);
  });
};

const createTask = (title, description, priority, callback) => {
  const sql = `INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)`;
  db.run(sql, [title, description, priority], function(err) {
    callback(err, this.lastID);
  });
};

const getAllTasks = (callback) => {
  const sql = `SELECT * FROM tasks ORDER BY created_at DESC`;
  db.all(sql, [], callback);
};

const getTaskById = (id, callback) => {
  const sql = `SELECT * FROM tasks WHERE id = ?`;
  db.get(sql, [id], callback);
};

const updateTask = (id, title, description, priority, completed, callback) => {
  const sql = `
    UPDATE tasks 
    SET title = ?, description = ?, priority = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(sql, [title, description, priority, completed, id], callback);
};

const deleteTask = (id, callback) => {
  const sql = `DELETE FROM tasks WHERE id = ?`;
  db.run(sql, [id], callback);
};

const closeDatabase = () => {
  db.close();
};

// Label operations
const createLabel = (name, color, callback) => {
  const sql = `INSERT INTO labels (name, color) VALUES (?, ?)`;
  db.run(sql, [name, color || '#808080'], function(err) {
    callback(err, this.lastID);
  });
};

const getAllLabels = (callback) => {
  const sql = `SELECT * FROM labels ORDER BY name ASC`;
  db.all(sql, [], callback);
};

const getLabelById = (id, callback) => {
  const sql = `SELECT * FROM labels WHERE id = ?`;
  db.get(sql, [id], callback);
};

// Optimized function to get labels for multiple tasks in a single query
// This avoids N+1 query problem
const getTaskLabelsOptimized = (taskIds, callback) => {
  if (!taskIds || taskIds.length === 0) {
    return callback(null, {});
  }
  
  const placeholders = taskIds.map(() => '?').join(',');
  const sql = `
    SELECT 
      tl.task_id,
      l.id,
      l.name,
      l.color,
      l.created_at
    FROM task_labels tl
    INNER JOIN labels l ON tl.label_id = l.id
    WHERE tl.task_id IN (${placeholders})
    ORDER BY l.name ASC
  `;
  
  db.all(sql, taskIds, (err, rows) => {
    if (err) {
      return callback(err);
    }
    
    // Group labels by task_id for easy lookup
    const labelsByTask = {};
    rows.forEach(row => {
      if (!labelsByTask[row.task_id]) {
        labelsByTask[row.task_id] = [];
      }
      labelsByTask[row.task_id].push({
        id: row.id,
        name: row.name,
        color: row.color,
        created_at: row.created_at
      });
    });
    
    callback(null, labelsByTask);
  });
};

// Get labels for a single task (convenience function)
const getTaskLabels = (taskId, callback) => {
  getTaskLabelsOptimized([taskId], (err, labelsByTask) => {
    if (err) {
      return callback(err);
    }
    callback(null, labelsByTask[taskId] || []);
  });
};

const assignLabelToTask = (taskId, labelId, callback) => {
  const sql = `INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`;
  db.run(sql, [taskId, labelId], callback);
};

const removeLabelFromTask = (taskId, labelId, callback) => {
  const sql = `DELETE FROM task_labels WHERE task_id = ? AND label_id = ?`;
  db.run(sql, [taskId, labelId], callback);
};

// Bulk operations for better performance
const bulkAssignLabels = (assignments, callback) => {
  if (!assignments || assignments.length === 0) {
    return callback(null);
  }
  
  let completed = 0;
  let hasError = false;
  
  assignments.forEach(({ taskId, labelId }) => {
    if (hasError) return;
    
    db.run(
      `INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`,
      [taskId, labelId],
      (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        
        completed++;
        if (completed === assignments.length && !hasError) {
          callback(null);
        }
      }
    );
  });
};

const bulkRemoveLabels = (removals, callback) => {
  if (!removals || removals.length === 0) {
    return callback(null);
  }
  
  let completed = 0;
  let hasError = false;
  
  removals.forEach(({ taskId, labelId }) => {
    if (hasError) return;
    
    db.run(
      `DELETE FROM task_labels WHERE task_id = ? AND label_id = ?`,
      [taskId, labelId],
      (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        
        completed++;
        if (completed === removals.length && !hasError) {
          callback(null);
        }
      }
    );
  });
};

module.exports = {
  initialize,
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  closeDatabase,
  // Label operations
  createLabel,
  getAllLabels,
  getLabelById,
  getTaskLabels,
  getTaskLabelsOptimized,
  assignLabelToTask,
  removeLabelFromTask,
  bulkAssignLabels,
  bulkRemoveLabels
};
