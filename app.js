
let config;
let editingTaskId = null;

const taskForm = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskDescription = document.getElementById("task-description");
const taskList = document.getElementById("task-list");
const taskSubmit = document.getElementById("task-submit");
const statusMessage = document.getElementById("status-message");
const taskCount = document.getElementById("task-count");
const cancelEdit = document.getElementById("cancel-edit");

let tasks = [];

async function initializeApp() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Could not load config.json");
        }

        config = await response.json();

        if (!config.supabaseUrl ||
            !config.supabasePublishableKey ||
            config.tableName !== "tasks") {
            throw new Error("Invalid Supabase configuration");
        }

        await loadTasks();

    } catch (error) {
        showMessage(error.message, "error");
        console.error(error);
    }
}

function getHeaders() {
    return {
        "apikey": config.supabasePublishableKey,
        "Authorization": `Bearer ${config.supabasePublishableKey}`,
        "Content-Type": "application/json"
    };
}

function getTasksUrl() {
    return `${config.supabaseUrl}/rest/v1/${config.tableName}`;
}

function showMessage(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

async function loadTasks() {
    try {
        showMessage("Loading tasks...");

        const response = await fetch(
            `${getTasksUrl()}?select=*&order=id.desc`,
            {
                method: "GET",
                headers: getHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load tasks");
        }

        tasks = await response.json();

        renderTasks();
        showMessage("Tasks loaded successfully", "success");

    } catch (error) {
        showMessage(error.message, "error");
        console.error(error);
    }
}

function renderTasks() {
    taskList.innerHTML = "";

    taskCount.textContent =
        `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

    if (tasks.length === 0) {
        taskList.innerHTML =
            '<p class="empty-message">No tasks yet. Add your first task!</p>';
        return;
    }

    tasks.forEach(task => {
        const taskElement = document.createElement("div");

        taskElement.className = "task-item";
        taskElement.dataset.id = task.id;

        if (task.completed) {
            taskElement.classList.add("completed");
        }

        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("div");
        description.className = "task-description";
        description.textContent = task.description || "";

        const status = document.createElement("span");
        status.className = "task-status";
        if (task.completed) {
            status.classList.add("completed");
        }
        status.textContent = task.completed ? "Completed" : "Pending";

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";
        editButton.type = "button";
        editButton.addEventListener("click", () => editTask(task.id));

        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent = task.completed
            ? "Mark Incomplete"
            : "Mark Complete";
        toggleButton.type = "button";
        toggleButton.addEventListener(
            "click",
            () => toggleTask(task.id)
        );

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";
        deleteButton.addEventListener(
            "click",
            () => deleteTask(task.id)
        );

        actions.append(editButton, toggleButton, deleteButton);

        taskElement.append(
            title,
            description,
            status,
            actions
        );

        taskList.appendChild(taskElement);
    });
}

async function saveTask(event) {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();

    if (!title) {
        showMessage("Task title is required", "error");
        return;
    }

    const isEditing = editingTaskId !== null;

    const taskData = {
        title,
        description,
        completed: isEditing
            ? tasks.find(task => task.id === editingTaskId).completed
            : false
    };

    try {
        let url = getTasksUrl();
        let method = "POST";

        if (isEditing) {
            url += `?id=eq.${editingTaskId}`;
            method = "PATCH";
        }

        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            throw new Error("Failed to save task");
        }

        resetForm();
        await loadTasks();

        showMessage(
            isEditing
                ? "Task updated successfully"
                : "Task added successfully",
            "success"
        );

    } catch (error) {
        showMessage(error.message, "error");
        console.error(error);
    }
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        showMessage("Task not found", "error");
        return;
    }

    editingTaskId = id;

    taskTitle.value = task.title;
    taskDescription.value = task.description || "";

    taskSubmit.textContent = "Save Changes";
    cancelEdit.hidden = false;

    document.getElementById("form-heading").textContent = "Edit Task";

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

async function toggleTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    try {
        const response = await fetch(
            `${getTasksUrl()}?id=eq.${id}`,
            {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                    completed: !task.completed
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update task status");
        }

        await loadTasks();

    } catch (error) {
        showMessage(error.message, "error");
        console.error(error);
    }
}

async function deleteTask(id) {
    const confirmed = confirm("Are you sure you want to delete this task?");

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${getTasksUrl()}?id=eq.${id}`,
            {
                method: "DELETE",
                headers: getHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete task");
        }

        await loadTasks();
        showMessage("Task deleted successfully", "success");

    } catch (error) {
        showMessage(error.message, "error");
        console.error(error);
    }
}

function resetForm() {
    taskForm.reset();

    editingTaskId = null;

    taskSubmit.textContent = "Add Task";
    cancelEdit.hidden = true;

    document.getElementById("form-heading").textContent =
        "Add New Task";
}

taskForm.addEventListener("submit", saveTask);

cancelEdit.addEventListener("click", () => {
    resetForm();
    showMessage("Editing cancelled");
});

initializeApp();
