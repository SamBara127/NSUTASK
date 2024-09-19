
function showFileName(file_name) {
    const fileNameDisplay = document.getElementById('fileName');

    if (file_name.length > 0) {
        fileNameDisplay.textContent = file_name;
    } else {
        // fileNameDisplay.textContent = "Файл не выбран";

        const fileInput = document.getElementById('fileInput');

        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        } 
        else 
        {
            fileNameDisplay.textContent = "Файл не выбран";
        }
    }
}



////////////////////////////////////////////////////////////////////

function createCategory(categoryId, categoryName) {
    const categoryContainer = document.createElement('section');
    categoryContainer.className = 'taskcat';
    categoryContainer.id = `taskcat-${categoryId}`;

    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'taskcat-wrapper';

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'taskcat-header';

    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'taskcat-header__title text-clip';
    categoryTitle.innerText = categoryName;
    const categoryContent = document.createElement('div');
    categoryContent.className = 'taskcat-content';

    categoryHeader.appendChild(categoryTitle);
    categoryWrapper.appendChild(categoryHeader);
    categoryWrapper.appendChild(categoryContent);

    categoryContainer.appendChild(categoryWrapper);

    tasklist.appendChild(categoryContainer);
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
function updateTasklist() {
    const token = getToken();
    const tasklist = document.querySelector('#tasklist');

    fetch(`../api/board${currentBoard}/submits`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(submitsData => {
        fetch(`../api/board${currentBoard}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(tasksData => {
            if (tasksData.message !== undefined) {
                document.querySelector('#tasklist').innerHTML = '<h1 class="tasklist-placeholder">Выберите доску, чтобы начать работу.</h1>';
                // Спасибо кэшу файрфокса за 30 минут дебага
                document.querySelector('#boardman-actions__edit-btn').disabled = true;
                document.querySelector('#boardman-actions__delete-btn').disabled = true;
                clearLastBoard();
                return;
            }

            tasklist.innerHTML = '';

            if (tasksData.length > 0) {
                for (const taskData of tasksData) {
                    const submitData = submitsData.filter(submitData => submitData.task_id === taskData.id)[0] || {};

                    createTasklistTask(taskData, submitData);
                }
            }
            else {
                tasklist.innerHTML = '<h2 class="tasklist-placeholder">Похоже, оператор этой доски пока<br>не создал ни одной задачи… пичаль.</h2>';
            }

            if (showActionsForOperator) {
                document.querySelector('#groupinfo-actions').classList.remove('hidden');
                document.querySelector('#boardman-actions__edit-btn').disabled = false;
                document.querySelector('#boardman-actions__delete-btn').disabled = false;
            }
        })
        .catch(error => console.error(error));
    })
}

function createTasklistTask(taskData, submitData) {
    const token = getToken();
    //console.log(taskData, submitData);

    // Сперва определяем категорию задачи, исходя из
    // статуса посылки в submitData (если есть)...
    let categoryId = 'unknown', categoryName = '⁉️ Неизвестно';
    if (!submitData.status || submitData.status === undefined) {
        categoryId = 'to-do';
        categoryName = '⚒️ К выполнению';
    }
    else {
        categoryId = submitData.status;

        switch (submitData.status) {
            case 'pending':
                categoryName = '🐝 На рассмотрении…';
                break;
            case 'accepted':
                categoryName = '🏆 ПРИНЯТО!';
                break;
            case 'rejected':
                categoryName = '🗿 Отклонено';
                break;
            default:
                categoryId = 'unknown';
                categoryName = '⁉️ Неизвестно';
                break;
        }
    }

    // Затем создаем задачу в соответствующей категории,
    // элемент за элементов (ну а **ли, на чистом JSе же пишем)...
    let category = document.querySelector(`#taskcat-${categoryId}`);
    if (!category) {
        createCategory(categoryId, categoryName);
        category = document.querySelector(`#taskcat-${categoryId}`);
    }

    const taskContainer = document.createElement('article');
    taskContainer.className = 'task';

    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';

    const taskTitle = document.createElement('h3');
    taskTitle.className = 'task-content__title text-clip';
    taskTitle.innerText = taskData.title;
    taskContent.appendChild(taskTitle);

    const taskText = document.createElement('p');
    taskText.className = 'task-content__text text-clip';
    taskText.innerText = taskData.body;
    taskContent.appendChild(taskText);

    const taskDue = document.createElement('i');
    taskDue.className = 'task-content__due';

    if (taskData.date_due !== null) {
    const taskDueDate = ISOtoDDMMYY(taskData.date_due);
        taskDue.innerText = `Срок сдачи: ДО ${taskDueDate}`;

        if (checkIfOutdated(taskData.date_due)) {
            taskDue.classList.add('task-outdated');
        }
    }
    taskContent.appendChild(taskDue);

    taskContent.onclick = () => {
        taskmanGetInfo(taskData.id, submitData.status);
        openTaskmanView();
    }

    taskContainer.appendChild(taskContent);

    // Наконец, если пользователь является оператором,
    // добавляем специальные кнопки управления задачей.
    if (showActionsForOperator) {
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        const taskActionsEdit = document.createElement('button');
        taskActionsEdit.className = 'task-actions__edit';
        taskActionsEdit.innerText = 'Изменить';
        taskActionsEdit.onclick = () => tasklistEditTask(taskData.id);

        const taskActionsDelete = document.createElement('button');
        taskActionsDelete.className = 'task-actions__delete';
        taskActionsDelete.innerText = 'Удалить';
        taskActionsDelete.onclick = () => tasklistDeleteTask(taskData.id);

        const taskActionsSubmits = document.createElement('button');
        taskActionsSubmits.className = 'task-actions__submits';
        taskActionsSubmits.innerText = `Посылок: ${taskData.submits_count}`;
        taskActionsSubmits.onclick = () => tasklistSubmitsPanel(taskData.id);

        taskActions.appendChild(taskActionsEdit);
        taskActions.appendChild(taskActionsDelete);
        taskActions.appendChild(taskActionsSubmits);
        taskContainer.appendChild(taskActions);
    }

    category.querySelector('.taskcat-content').appendChild(taskContainer);
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ОПЕРАТОРА
function tasklistNewTask() {
    const token = getToken();

    const formData = [
        { name: '<h2>Создание новой задачи</h2>', type: 'custom' },
        { name: 'Заголовок задачи', type: 'text', allowEmpty: false },
        { name: 'Текст задачи', type: 'textarea', allowEmpty: true },
        { name: 'Срок сдачи (НЕ включительно)', type: 'date', allowEmpty: true },
        { name: '<i>Оставьте пустым, чтобы сделать задачу бессрочной.</i>', type: 'custom' },
    ];

    showFileName('');

    modalmanForm(formData, true)
    .then(formResults => {
        if (!formResults) { return; }

        console.log('Полученная форма файла -> ', formResults[3]);

        // Создаем объект FormData
        const formData = new FormData();
        formData.append('title', formResults[0]);
        formData.append('body', formResults[1]);
        formData.append('dateDue', formResults[2] || null);

        // Получаем файл из fileInput
        const fileInput = document.getElementById('fileInput');
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]); // Добавляем файл в FormData
        }

        fetch(`../api/board${currentBoard}/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` // Устанавливаем только заголовок авторизации
            },
            body: formData // Передаем FormData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message !== undefined) { alert(data.message); }

            updateTasklist();
        })
        .catch(error => console.error(error));
    });
}


function tasklistEditTask(taskId) {
    const token = getToken();

    fetch(`../api/board${currentBoard}/task${taskId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        
        // document.getElementById('fileName').value = data.file_name;
        const formData = [
            { name: '<h2>Изменение задачи</h2>', type: 'custom' },
            { name: 'Заголовок задачи', type: 'text', allowEmpty: false, defaultValue: data.title },
            { name: 'Текст задачи', type: 'textarea', allowEmpty: true, defaultValue: data.body },
            { name: 'Срок сдачи (НЕ включительно)', type: 'date', allowEmpty: true, defaultValue: data.date_due },
            { name: '<i>Оставьте пустым, чтобы сделать задачу бессрочной.</i>', type: 'custom' },
        ];

        showFileName(data.file_name);

        modalmanForm(formData, true)
        .then(formResults => {
            if (!formResults) { return; }

            // Создаем объект FormData для отправки формы
            const formData = new FormData();
            formData.append('title', formResults[0]);
            formData.append('body', formResults[1]);
            formData.append('dateDue', formResults[2] || null);

            // Получаем файл из fileInput
            const fileInput = document.getElementById('fileInput');
            if (fileInput && fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]); // Добавляем файл в FormData
            }

            // Отправляем запрос на изменение задачи
            fetch(`../api/board${currentBoard}/task${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}` // Заголовок авторизации
                },
                body: formData // Передаем объект FormData
            })
            .then(response => response.json())
            .then(data => {
                if (data.message !== undefined) {
                    alert(data.message);
                }
                updateTasklist();
            })
            .catch(error => console.error(error));
        });
    });
}


function tasklistDeleteTask(taskId) {
    const token = getToken();

    if (confirm("Вы уверены, что хотите удалить эту задачу?")) {
        fetch(`../api/board${currentBoard}/task${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message !== undefined) { alert(data.message); }

            updateTasklist();
        })
        .catch(error => console.error(error));
    }
}

function tasklistSubmitsPanel(taskId) {
    const token = getToken();

    fetch(`../api/board${currentBoard}/task${taskId}/submits`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.length > 0) {
            const formData = [
                { name: '<h2>Управление посылками задачи</h2>', type: 'custom' },
                ...data.map(submit => ({
                    name: `Посылка ${submit}`,
                    type: 'radio',
                    allowEmpty: false
                }))
            ];

            modalmanForm(formData, false).then(formResults => {
                if (!formResults) return;

                const selectedSubmitIndex = formResults.findIndex(value => value === true);
                if (selectedSubmitIndex === -1) { return };

                fetch(`../api/board${currentBoard}/task${taskId}/submit${data[selectedSubmitIndex]}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                })
                .then(response => response.json())
                .then(submitData => {
                    if (submitData.message) {
                        alert(submitData.message);
                        return;
                    }
                    //console.log(submitData);

                    const statusFormData = [
                        { name: `<h2>Посылка от ${submitData.display_name} (${submitData.username})`, type: 'custom' },
                        { name: `<i>Дата отправления: ${ISOtoDDMMYY(submitData.date_submitted)}</i>`, type: 'custom' },
                        { name: `<pre>${submitData.text}</pre>`, type: 'custom' },
                        { name: '<br><i>Выберите статус посылки:</i>', type: 'custom' },
                        { name: '🏆 ПРИНЯТО!', type: 'radio', defaultValue: (submitData.status === 'accepted'), allowEmpty: false },
                        { name: '🗿 Отклонено', type: 'radio', defaultValue: (submitData.status === 'rejected'), allowEmpty: false },
                        { name: '🐝 На рассмотрении…', type: 'radio', defaultValue: (submitData.status === 'pending'), allowEmpty: false }
                    ];

                    modalmanForm(statusFormData, false).then(statusFormResults => {
                        if (!statusFormResults) { return };

                        const selectedStatusIndex = statusFormResults.findIndex(value => value === true);
                        if (selectedStatusIndex === -1) { return };

                        let newSubmitStatus = null;
                        if (selectedStatusIndex === 0) {
                            newSubmitStatus = 'accepted';
                        }
                        else if (selectedStatusIndex === 1) {
                            newSubmitStatus = 'rejected';
                        }
                        else {
                            newSubmitStatus = 'pending';
                        }

                        fetch(`../api/board${currentBoard}/task${taskId}/submit${data[selectedSubmitIndex]}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                status: newSubmitStatus
                            })
                        })
                        .then(response => response.json())
                        .then(updateData => {
                            if (updateData.message) {
                                alert(updateData.message);
                            } else {
                                tasklistSubmitsPanel(taskId);
                            }
                        })
                        .catch(error => console.error(error));
                    });
                })
                .catch(error => console.error(error));
            });
        } else {
            alert('Нет посылок для просмотра.');
        }
    })
    .catch(error => alert(error.message));
}
