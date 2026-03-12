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
        rating INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add rating column for existing databases that predate this feature
    db.run(`ALTER TABLE tasks ADD COLUMN rating INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding rating column:', err);
      }
    });
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

const updateTask = (id, title, description, priority, completed, rating, callback) => {
  const sql = `
    UPDATE tasks 
    SET title = ?, description = ?, priority = ?, completed = ?, rating = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(sql, [title, description, priority, completed, rating, id], callback);
};

const deleteTask = (id, callback) => {
  const sql = `DELETE FROM tasks WHERE id = ?`;
  db.run(sql, [id], callback);
};

const setTaskRating = (id, rating, callback) => {
  const sql = `UPDATE tasks SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, [rating, id], callback);
};

const getTaskRating = (id, callback) => {
  const sql = `SELECT rating FROM tasks WHERE id = ?`;
  db.get(sql, [id], callback);
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
  setTaskRating,
  getTaskRating,
  closeDatabase
};
