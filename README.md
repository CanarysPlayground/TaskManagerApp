# Task Manager

A simple Node.js Express app for managing tasks with SQLite database.

## Features

- ✅ Create, read, update, and delete tasks
- ✅ Mark tasks as completed
- ✅ Set task priority (Low, Medium, High)
- ✅ Task descriptions
- ✅ Clean and responsive UI
- ✅ RESTful API
- ✨ **NEW**: Pagination support for large datasets
- ✨ **NEW**: Filter by priority and completion status
- ✨ **NEW**: Response caching for improved performance
- ✨ **NEW**: Gzip compression for faster data transfer
- ✨ **NEW**: Database indexes for optimized queries

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

### Get all tasks (with pagination and filtering)
```
GET /api/tasks
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number (must be >= 1)
- `limit` (optional, default: 50, max: 100) - Tasks per page
- `priority` (optional) - Filter by priority: `low`, `medium`, or `high`
- `completed` (optional) - Filter by completion status: `0` (incomplete) or `1` (complete)

**Examples:**
```bash
# Get first page (default 50 tasks)
GET /api/tasks

# Get second page with 25 tasks per page
GET /api/tasks?page=2&limit=25

# Get only high priority tasks
GET /api/tasks?priority=high

# Get completed tasks
GET /api/tasks?completed=1

# Combined filtering and pagination
GET /api/tasks?priority=high&completed=0&page=1&limit=10
```

**Response Format:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "description": "Task description",
      "priority": "high",
      "completed": 0,
      "created_at": "2024-03-26T10:00:00.000Z",
      "updated_at": "2024-03-26T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 250,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Get a specific task
```
GET /api/tasks/:id
```

**Note**: Individual task lookups are cached for 60 seconds for improved performance.

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
  "completed": 1 // 0 or 1
}
```

**Note**: Only fields that are provided will be updated. You can update a single field without affecting others.

### Delete a task
```
DELETE /api/tasks/:id
```

## Performance Optimizations

This application includes several performance optimizations:

1. **Database Indexes**: Indexes on `priority`, `completed`, and `created_at` fields for faster queries
2. **Pagination**: Prevents loading large datasets at once
3. **Filtering**: Reduces data transfer by returning only relevant tasks
4. **Caching**: In-memory cache for frequently accessed individual tasks (60s TTL)
5. **Compression**: Gzip compression reduces response size by ~70%
6. **Dynamic Updates**: Only updates changed fields in the database
7. **Parallel Queries**: Task data and count queries run in parallel

See [OPTIMIZATION_REPORT.md](OPTIMIZATION_REPORT.md) for detailed performance analysis.

## Project Structure

```
TaskManagerApp/
├── index.js                    # Main Express application
├── database.js                 # SQLite database functions
├── package.json                # Project dependencies
├── OPTIMIZATION_REPORT.md      # Performance optimization details
├── public/                     # Static files (CSS, JavaScript)
│   ├── style.css
│   └── script.js
├── views/                      # EJS templates
│   └── index.ejs
├── tests/                      # Test suite
│   ├── routes.test.js         # API route tests
│   └── optimizations.test.js  # Optimization feature tests
└── tasks.db                    # SQLite database (created automatically)
```

## Dependencies

- **express**: Web framework
- **sqlite3**: SQLite database driver
- **body-parser**: Middleware for parsing request bodies
- **ejs**: Templating engine
- **compression**: Gzip compression middleware

## Development Dependencies

- **nodemon**: Auto-reload server during development
- **jest**: Testing framework
- **supertest**: HTTP testing library

## Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- API endpoint tests (24 tests)
- Optimization feature tests (11 tests)
- Cache behavior validation
- Pagination and filtering validation

## License

ISC
