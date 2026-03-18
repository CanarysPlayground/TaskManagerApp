document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const priority = document.getElementById('priority').value;

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, priority })
        });

        if (response.ok) {
            document.getElementById('taskForm').reset();
            loadTasks();
        } else {
            alert('Error adding task');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding task');
    }
});

document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('task-checkbox')) {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.id;
        const isCompleted = e.target.checked ? 1 : 0;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: isCompleted })
            });

            if (response.ok) {
                if (isCompleted) {
                    taskItem.classList.add('completed');
                } else {
                    taskItem.classList.remove('completed');
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this task?')) {
            const taskItem = e.target.closest('.task-item');
            const taskId = taskItem.dataset.id;

            try {
                const response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    taskItem.remove();
                    const tasksList = document.getElementById('tasksList');
                    if (tasksList.children.length === 0) {
                        tasksList.innerHTML = '<p class="no-tasks">No tasks yet. Create one to get started!</p>';
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting task');
            }
        }
    }
});

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();

        const tasksList = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<p class="no-tasks">No tasks yet. Create one to get started!</p>';
            return;
        }

        tasksList.innerHTML = tasks.map(task => {
            const safePriority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
            return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${escapeHtml(String(task.id))}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <h3>${escapeHtml(task.title)}</h3>
                    <p>${escapeHtml(task.description)}</p>
                    <span class="priority ${safePriority}">${escapeHtml(task.priority)}</span>
                    <small>${new Date(task.created_at).toLocaleDateString()}</small>
                </div>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
