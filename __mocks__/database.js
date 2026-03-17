const database = {
  initialize: jest.fn(),
  createTask: jest.fn(),
  getAllTasks: jest.fn(),
  getTaskById: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  setTaskRating: jest.fn(),
  getTaskRating: jest.fn(),
  closeDatabase: jest.fn(),
};

module.exports = database;
