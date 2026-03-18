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
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)`);
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
  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (completed !== undefined) { fields.push('completed = ?'); values.push(completed); }

  if (fields.length === 0) {
    return callback(new Error('No fields to update'));
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  db.run(sql, values, callback);
};

const deleteTask = (id, callback) => {
  const sql = `DELETE FROM tasks WHERE id = ?`;
  db.run(sql, [id], callback);
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
  closeDatabase
};
