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
        label TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`ALTER TABLE tasks ADD COLUMN label TEXT DEFAULT ''`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding label column:', err);
      }
    });
  });
};

const createTask = (title, description, priority, label, callback) => {
  const sql = `INSERT INTO tasks (title, description, priority, label) VALUES (?, ?, ?, ?)`;
  db.run(sql, [title, description, priority, label], function(err) {
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

const updateTask = (id, title, description, priority, completed, label, callback) => {
  const sql = `
    UPDATE tasks 
    SET title = ?, description = ?, priority = ?, completed = ?, label = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(sql, [title, description, priority, completed, label, id], callback);
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
