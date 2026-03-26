jest.mock('../database');
const db = require('../database');
const { enrichTasksWithLabels } = require('../index');

describe('enrichTasksWithLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls callback with null and original value when tasks is null', (done) => {
    enrichTasksWithLabels(null, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBeNull();
      expect(db.getTaskLabels).not.toHaveBeenCalled();
      done();
    });
  });

  test('calls callback with null and original value when tasks is empty array', (done) => {
    enrichTasksWithLabels([], (err, result) => {
      expect(err).toBeNull();
      expect(result).toEqual([]);
      expect(db.getTaskLabels).not.toHaveBeenCalled();
      done();
    });
  });

  test('enriches a single task with its labels', (done) => {
    const tasks = [{ id: 1, title: 'Task 1' }];
    const labels = [{ id: 10, name: 'bug', color: '#FF0000' }];
    db.getTaskLabels.mockImplementation((taskId, callback) => callback(null, labels));

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, title: 'Task 1', labels });
      expect(db.getTaskLabels).toHaveBeenCalledWith(1, expect.any(Function));
      done();
    });
  });

  test('enriches multiple tasks with their respective labels', (done) => {
    const tasks = [
      { id: 1, title: 'Task 1' },
      { id: 2, title: 'Task 2' },
    ];
    const labelsForTask1 = [{ id: 10, name: 'bug' }];
    const labelsForTask2 = [{ id: 11, name: 'feature' }, { id: 12, name: 'urgent' }];

    db.getTaskLabels.mockImplementation((taskId, callback) => {
      if (taskId === 1) callback(null, labelsForTask1);
      else if (taskId === 2) callback(null, labelsForTask2);
    });

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, title: 'Task 1', labels: labelsForTask1 });
      expect(result[1]).toEqual({ id: 2, title: 'Task 2', labels: labelsForTask2 });
      done();
    });
  });

  test('sets labels to empty array when getTaskLabels returns null', (done) => {
    const tasks = [{ id: 1, title: 'Task 1' }];
    db.getTaskLabels.mockImplementation((taskId, callback) => callback(null, null));

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result[0].labels).toEqual([]);
      done();
    });
  });

  test('sets labels to empty array on getTaskLabels error', (done) => {
    const tasks = [{ id: 1, title: 'Task 1' }];
    db.getTaskLabels.mockImplementation((taskId, callback) =>
      callback(new Error('DB error'), null)
    );

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result[0].labels).toEqual([]);
      done();
    });
  });

  test('preserves all original task fields alongside labels', (done) => {
    const tasks = [{ id: 3, title: 'Task 3', priority: 'high', completed: 0, rating: 4 }];
    const labels = [{ id: 20, name: 'review' }];
    db.getTaskLabels.mockImplementation((taskId, callback) => callback(null, labels));

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result[0]).toMatchObject({
        id: 3,
        title: 'Task 3',
        priority: 'high',
        completed: 0,
        rating: 4,
        labels,
      });
      done();
    });
  });

  test('handles mixed success and error across multiple tasks', (done) => {
    const tasks = [{ id: 1, title: 'Task 1' }, { id: 2, title: 'Task 2' }];
    db.getTaskLabels.mockImplementation((taskId, callback) => {
      if (taskId === 1) callback(new Error('fail'), null);
      else callback(null, [{ id: 5, name: 'ok' }]);
    });

    enrichTasksWithLabels(tasks, (err, result) => {
      expect(err).toBeNull();
      expect(result[0].labels).toEqual([]);
      expect(result[1].labels).toEqual([{ id: 5, name: 'ok' }]);
      done();
    });
  });
});
