const getRatingLabel = (rating) => {
    return rating > 0 ? `${rating}/5` : 'Unrated';
};

const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => {
        const filledClass = star <= rating ? 'filled' : '';
        const starText = star === 1 ? 'star' : 'stars';
        return `
            <button
                type="button"
                class="star ${filledClass}"
                data-rating="${star}"
                aria-label="Set rating to ${star} ${starText}"
            >★</button>
        `;
    }).join('');
};

const updateRatingDisplay = (taskItem, rating) => {
    const stars = taskItem.querySelectorAll('.star');
    stars.forEach((star, idx) => {
        star.classList.toggle('filled', idx < rating);
    });

    const ratingValue = taskItem.querySelector('.rating-value');
    if (ratingValue) {
        ratingValue.textContent = getRatingLabel(rating);
    }
};

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
                        loadTasks();
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error deleting task');
            }
        }
    }

    const starButton = e.target.closest('.star');
    if (starButton) {
        const taskItem = starButton.closest('.task-item');
        const taskId = taskItem.dataset.id;
        const rating = parseInt(starButton.dataset.rating, 10);

        try {
            const response = await fetch(`/api/tasks/${taskId}/rating`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });

            if (response.ok) {
                updateRatingDisplay(taskItem, rating);
            }
        } catch (error) {
            console.error('Error:', error);
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

        tasksList.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <h3>${task.title}</h3>
                    <p>${task.description}</p>
                    <span class="priority ${task.priority}">${task.priority}</span>
                    <div class="rating-row">
                        <span class="rating-label">Rating:</span>
                        <div class="star-rating" role="radiogroup" aria-label="Rate task">
                            ${renderStars(task.rating || 0)}
                        </div>
                        <small class="rating-value">${getRatingLabel(task.rating || 0)}</small>
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
