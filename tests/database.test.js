const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use an in-memory database for tests
const db = new sqlite3.Database(':memory:');

const initialize = (done) => {
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
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)`, done);
  });
};

const createTask = (title, description, priority, callback) => {
  db.run(
    `INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)`,
    [title, description, priority],
    function(err) { callback(err, this.lastID); }
  );
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

const getTaskById = (id, callback) => {
  db.get(`SELECT * FROM tasks WHERE id = ?`, [id], callback);
};

describe('database.js - updateTask partial update', () => {
  let taskId;

  beforeAll((done) => {
    initialize(() => {
      createTask('Original title', 'Original description', 'medium', (err, id) => {
        taskId = id;
        done(err);
      });
    });
  });

  afterAll((done) => {
    db.close(done);
  });

  test('updates only the title when only title is provided', (done) => {
    updateTask(taskId, 'New title', undefined, undefined, undefined, (err) => {
      expect(err).toBeNull();
      getTaskById(taskId, (err, task) => {
        expect(err).toBeNull();
        expect(task.title).toBe('New title');
        expect(task.description).toBe('Original description');
        expect(task.priority).toBe('medium');
        expect(task.completed).toBe(0);
        done();
      });
    });
  });

  test('updates only completed when only completed is provided', (done) => {
    updateTask(taskId, undefined, undefined, undefined, 1, (err) => {
      expect(err).toBeNull();
      getTaskById(taskId, (err, task) => {
        expect(err).toBeNull();
        expect(task.completed).toBe(1);
        expect(task.title).toBe('New title');
        expect(task.description).toBe('Original description');
        done();
      });
    });
  });

  test('updates multiple fields at once', (done) => {
    updateTask(taskId, 'Multi update', 'New desc', 'high', 0, (err) => {
      expect(err).toBeNull();
      getTaskById(taskId, (err, task) => {
        expect(err).toBeNull();
        expect(task.title).toBe('Multi update');
        expect(task.description).toBe('New desc');
        expect(task.priority).toBe('high');
        expect(task.completed).toBe(0);
        done();
      });
    });
  });

  test('returns an error when no fields are provided', (done) => {
    updateTask(taskId, undefined, undefined, undefined, undefined, (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('No fields to update');
      done();
    });
  });
});
