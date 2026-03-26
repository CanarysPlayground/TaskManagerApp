// Store all labels
let allLabels = [];
let currentFilterLabelId = 'all';

// Load labels on page load
document.addEventListener('DOMContentLoaded', () => {
    loadLabels();
    loadTasks();
});

// Load all labels
async function loadLabels() {
    try {
        const response = await fetch('/api/labels');
        allLabels = await response.json();
        renderLabelsDisplay();
        renderLabelCheckboxes();
        renderFilterButtons();
    } catch (error) {
        console.error('Error loading labels:', error);
    }
}

// Render labels in the labels display section
function renderLabelsDisplay() {
    const labelsList = document.getElementById('labelsList');
    
    if (allLabels.length === 0) {
        labelsList.innerHTML = '<p class="no-labels">No labels yet. Create one to get started!</p>';
        return;
    }

    labelsList.innerHTML = allLabels.map(label => `
        <div class="label-item">
            <span class="label-badge" style="background-color: ${label.color};">${label.name}</span>
            <button class="delete-label-btn" data-label-id="${label.id}">Delete</button>
        </div>
    `).join('');
}

// Render label checkboxes in the task form
function renderLabelCheckboxes() {
    const labelCheckboxes = document.getElementById('labelCheckboxes');
    
    if (allLabels.length === 0) {
        labelCheckboxes.innerHTML = '<p class="no-labels-info">No labels available. Create some labels first.</p>';
        return;
    }

    labelCheckboxes.innerHTML = allLabels.map(label => `
        <div class="label-checkbox">
            <input type="checkbox" id="label-${label.id}" value="${label.id}" name="labels">
            <label for="label-${label.id}" style="color: ${label.color};">${label.name}</label>
        </div>
    `).join('');
}

// Render filter buttons
function renderFilterButtons() {
    const filterLabels = document.getElementById('filterLabels');
    
    let html = '<button class="filter-btn active" data-label-id="all">All Tasks</button>';
    
    allLabels.forEach(label => {
        html += `<button class="filter-btn" data-label-id="${label.id}" style="background-color: ${label.color};">${label.name}</button>`;
    });
    
    filterLabels.innerHTML = html;
}

// Create a new label
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'labelForm') {
        e.preventDefault();

        const name = document.getElementById('labelName').value.trim();
        const color = document.getElementById('labelColor').value;

        if (!name) {
            alert('Please enter a label name');
            return;
        }

        try {
            const response = await fetch('/api/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color })
            });

            if (response.ok) {
                document.getElementById('labelForm').reset();
                document.getElementById('labelColor').value = '#808080';
                loadLabels();
            } else {
                const error = await response.json();
                alert(error.error || 'Error creating label');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating label');
        }
    } else if (e.target.id === 'taskForm') {
        e.preventDefault();

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const priority = document.getElementById('priority').value;
        
        // Get selected labels
        const selectedLabels = Array.from(document.querySelectorAll('input[name="labels"]:checked'))
            .map(checkbox => parseInt(checkbox.value));

        try {
            const taskResponse = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, priority })
            });

            if (taskResponse.ok) {
                const newTask = await taskResponse.json();
                
                // Assign labels to the new task
                for (const labelId of selectedLabels) {
                    await fetch(`/api/tasks/${newTask.id}/labels/${labelId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                document.getElementById('taskForm').reset();
                loadTasks();
            } else {
                alert('Error adding task');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error adding task');
        }
    }
});

// Task checkbox change
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

// Delete task and other click handlers
document.addEventListener('click', async (e) => {
    // Delete label
    if (e.target.classList.contains('delete-label-btn')) {
        const labelId = e.target.dataset.labelId;
        
        if (confirm('Are you sure you want to delete this label? Tasks with this label will not be deleted.')) {
            try {
                const response = await fetch(`/api/labels/${labelId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    loadLabels();
                } else {
                    alert('Error deleting label');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting label');
            }
        }
    }

    // Delete task
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
                        loadTasks();
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting task');
            }
        }
    }

    // Star rating
    if (e.target.classList.contains('star')) {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.id;
        const rating = parseInt(e.target.dataset.rating);

        try {
            const response = await fetch(`/api/tasks/${taskId}/rating`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });

            if (response.ok) {
                const stars = taskItem.querySelectorAll('.star');
                stars.forEach((star, idx) => {
                    star.classList.toggle('filled', idx < rating);
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Remove label from task
    if (e.target.classList.contains('remove-label-btn')) {
        e.preventDefault();
        const taskId = e.target.dataset.taskId;
        const labelId = e.target.dataset.labelId;

        try {
            const response = await fetch(`/api/tasks/${taskId}/labels/${labelId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadTasks();
            } else {
                alert('Error removing label');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error removing label');
        }
    }

    // Filter tasks by label
    if (e.target.classList.contains('filter-btn')) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        currentFilterLabelId = e.target.dataset.labelId;
        loadTasks();
    }
});

// Load tasks
async function loadTasks() {
    try {
        let tasksData = [];

        if (currentFilterLabelId === 'all') {
            // Load all tasks
            const response = await fetch('/api/tasks');
            tasksData = await response.json();
        } else {
            // Load tasks for specific label (server returns tasks enriched with their labels)
            const response = await fetch(`/api/labels/${currentFilterLabelId}/tasks`);
            tasksData = await response.json();
        }

        const tasksList = document.getElementById('tasksList');
        
        if (tasksData.length === 0) {
            tasksList.innerHTML = '<p class="no-tasks">No tasks yet. Create one to get started!</p>';
            return;
        }

        tasksList.innerHTML = tasksData.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" data-labels="${task.labels ? task.labels.map(l => l.id).join(',') : ''}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <h3>${task.title}</h3>
                    <p>${task.description}</p>
                    <span class="priority ${task.priority}">${task.priority}</span>
                    ${task.labels && task.labels.length > 0 ? `
                        <div class="task-labels">
                            ${task.labels.map(label => `
                                <span class="label-badge" style="background-color: ${label.color};" data-label-id="${label.id}" title="${label.name}">
                                    ${label.name}
                                    <button type="button" class="remove-label-btn" data-task-id="${task.id}" data-label-id="${label.id}">×</button>
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="star-rating">
                        ${[1, 2, 3, 4, 5].map(star =>
                            `<span class="star ${star <= task.rating ? 'filled' : ''}" data-rating="${star}">★</span>`
                        ).join('')}
                    </div>
                    <small>${new Date(task.created_at).toLocaleDateString()}</small>
                </div>
                <button class="delete-btn">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}
