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
        PRIMARY KEY (task_id, label_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);
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
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        completed = COALESCE(?, completed),
        rating = COALESCE(?, rating),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(sql, [title ?? null, description ?? null, priority ?? null, completed ?? null, rating ?? null, id], callback);
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

// Label-related functions
const createLabel = (name, color, callback) => {
  const sql = `INSERT INTO labels (name, color) VALUES (?, ?)`;
  db.run(sql, [name, color], function(err) {
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

const updateLabel = (id, name, color, callback) => {
  const sql = `UPDATE labels SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?`;
  db.run(sql, [name ?? null, color ?? null, id], callback);
};

const deleteLabel = (id, callback) => {
  const sql = `DELETE FROM labels WHERE id = ?`;
  db.run(sql, [id], callback);
};

const assignLabelToTask = (taskId, labelId, callback) => {
  const sql = `INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)`;
  db.run(sql, [taskId, labelId], callback);
};

const removeLabelFromTask = (taskId, labelId, callback) => {
  const sql = `DELETE FROM task_labels WHERE task_id = ? AND label_id = ?`;
  db.run(sql, [taskId, labelId], callback);
};

const getTaskLabels = (taskId, callback) => {
  const sql = `
    SELECT l.* FROM labels l
    INNER JOIN task_labels tl ON l.id = tl.label_id
    WHERE tl.task_id = ?
    ORDER BY l.name ASC
  `;
  db.all(sql, [taskId], callback);
};

const getTasksByLabel = (labelId, callback) => {
  const sql = `
    SELECT t.* FROM tasks t
    INNER JOIN task_labels tl ON t.id = tl.task_id
    WHERE tl.label_id = ?
    ORDER BY t.created_at DESC
  `;
  db.all(sql, [labelId], callback);
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
  createLabel,
  getAllLabels,
  getLabelById,
  updateLabel,
  deleteLabel,
  assignLabelToTask,
  removeLabelFromTask,
  getTaskLabels,
  getTasksByLabel,
  closeDatabase
};
