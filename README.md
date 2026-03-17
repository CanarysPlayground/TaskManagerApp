# Task Manager

A simple Node.js Express app for managing tasks with SQLite database.

## Features

- ✅ Create, read, update, and delete tasks
- ✅ Mark tasks as completed
- ✅ Set task priority (Low, Medium, High)
- ✅ Task descriptions
- ✅ Rate each task (1-5 stars)
- ✅ Clean and responsive UI
- ✅ RESTful API

## Installation

1. Navigate to the project directory:
```bash
cd TaskManagerApp
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Start the app:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

### Get all tasks
```
GET /api/tasks
```

### Get a specific task
```
GET /api/tasks/:id
```

### Create a new task
```
POST /api/tasks
Body: {
  "title": "Task title",
  "description": "Task description",
  "priority": "medium" // low, medium, high
}
```

### Update a task
```
PUT /api/tasks/:id
Body: {
  "title": "Updated title",
  "description": "Updated description",
  "priority": "high",
  "completed": 1, // 0 or 1
  "rating": 4 // 0 to 5
}
```

### Get task rating
```
GET /api/tasks/:id/rating
```

### Set task rating
```
PUT /api/tasks/:id/rating
Body: {
  "rating": 5 // 0 to 5
}
```

### Delete a task
```
DELETE /api/tasks/:id
```

## Project Structure

```
TaskManagerApp/
├── index.js           # Main Express application
├── database.js        # SQLite database functions
├── package.json       # Project dependencies
├── public/            # Static files (CSS, JavaScript)
│   ├── style.css
│   └── script.js
├── views/             # EJS templates
│   └── index.ejs
└── tasks.db           # SQLite database (created automatically)
```

## Dependencies

- **express**: Web framework
- **sqlite3**: SQLite database driver
- **body-parser**: Middleware for parsing request bodies
- **ejs**: Templating engine

## Development Dependencies

- **nodemon**: Auto-reload server during development

## License

ISC
