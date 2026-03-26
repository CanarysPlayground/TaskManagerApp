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
    
    // Create indexes for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)`);
  });
};

const createTask = (title, description, priority, callback) => {
  const sql = `INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)`;
  db.run(sql, [title, description, priority], function(err) {
    callback(err, this.lastID);
  });
};

const getAllTasks = (callback, options = {}) => {
  const { limit, offset, priority, completed } = options;
  
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  
  // Add filtering conditions
  if (priority !== undefined) {
    sql += ' AND priority = ?';
    params.push(priority);
  }
  if (completed !== undefined) {
    sql += ' AND completed = ?';
    params.push(completed);
  }
  
  // Always order by created_at DESC for consistency
  sql += ' ORDER BY created_at DESC';
  
  // Add pagination
  if (limit !== undefined) {
    sql += ' LIMIT ?';
    params.push(limit);
    
    if (offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(offset);
    }
  }
  
  db.all(sql, params, callback);
};

const getTaskById = (id, callback) => {
  const sql = `SELECT * FROM tasks WHERE id = ?`;
  db.get(sql, [id], callback);
};

const updateTask = (id, title, description, priority, completed, callback) => {
  // Build dynamic UPDATE query to only update provided fields
  const updates = [];
  const values = [];
  
  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (priority !== undefined) {
    updates.push('priority = ?');
    values.push(priority);
  }
  if (completed !== undefined) {
    updates.push('completed = ?');
    values.push(completed);
  }
  
  // Always update updated_at timestamp
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  db.run(sql, values, callback);
};

const deleteTask = (id, callback) => {
  const sql = `DELETE FROM tasks WHERE id = ?`;
  db.run(sql, [id], callback);
};

const getTaskCount = (callback, options = {}) => {
  const { priority, completed } = options;
  
  let sql = 'SELECT COUNT(*) as count FROM tasks WHERE 1=1';
  const params = [];
  
  // Add filtering conditions
  if (priority !== undefined) {
    sql += ' AND priority = ?';
    params.push(priority);
  }
  if (completed !== undefined) {
    sql += ' AND completed = ?';
    params.push(completed);
  }
  
  db.get(sql, params, callback);
};

const closeDatabase = () => {
  db.close();
};

module.exports = {
  initialize,
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskCount,
  closeDatabase
};
