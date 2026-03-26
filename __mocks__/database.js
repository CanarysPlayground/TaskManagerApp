const database = {
  initialize: jest.fn(),
  createTask: jest.fn(),
  getAllTasks: jest.fn(),
  getTaskById: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  setTaskRating: jest.fn(),
  getTaskRating: jest.fn(),
  createLabel: jest.fn(),
  getAllLabels: jest.fn(),
  getLabelById: jest.fn(),
  updateLabel: jest.fn(),
  deleteLabel: jest.fn(),
  assignLabelToTask: jest.fn(),
  removeLabelFromTask: jest.fn(),
  getTaskLabels: jest.fn(),
  getTasksByLabel: jest.fn(),
  closeDatabase: jest.fn(),
};

module.exports = database;
