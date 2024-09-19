var currentTask = null;

function openTaskmanView() {
    document.querySelectorAll(".taskman-spacer").forEach(e => e.classList.remove('closed'));
    document.querySelector("#taskman").classList.remove('closed');
}

function closeTaskmanView() {
    document.querySelectorAll(".taskman-spacer").forEach(e => e.classList.add('closed'));
    document.querySelector("#taskman").classList.add('closed');

    currentTask = null;
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
function taskmanGetInfo(taskId, submitStatus) {
    const token = getToken();

    fetch(`../api/board${currentBoard}/task${taskId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        currentTask = taskId;
        const taskInfo = document.querySelector('#taskman-taskinfo');
        const taskSubmits = document.querySelector('#taskman-tasksubmits');
        taskInfo.innerHTML = '';
        taskSubmits.innerHTML = '';

        // Проверяем наличие файла
        const taskDownload = document.getElementById('taskman-file');
        const taskDownloadFilename = document.getElementById('taskman-file__filename');
        // const taskDownloadButton = document.getElementById('taskman-file__btn-download');

        if (data.file_name == null) {
            taskDownload.style.display = 'none'; // Скрываем, если файл не найден
        } else {
            taskDownload.style.display = 'unset'; // Показываем блок файла
            taskDownloadFilename.innerText = `Файл: ${data.file_name}`; // Обновляем имя файла
            // taskDownloadButton.onclick = () => {
            //     window.location.href = `../api/board${currentBoard}/task/${taskId}/download`; // Обновляем ссылку для скачивания
            // };
        }
        // console.log("BEEEEEEEP!!!!");

        const taskTitle = document.createElement('h1');
        taskTitle.innerText = data.title;
        taskInfo.appendChild(taskTitle);

        const taskBody = document.createElement('pre');
        taskBody.innerText = data.body;
        taskInfo.appendChild(taskBody);

        taskInfo.appendChild(document.createElement('br'));

        const taskDue = document.createElement('i');
        if (data.date_due !== 'null') {
            const taskDueDate = ISOtoDDMMYY(data.date_due);
            taskDue.innerText = `Срок сдачи: ДО ${taskDueDate} (не включительно)`;

            if (checkIfOutdated(data.date_due)) {
                taskDue.classList.add('task-outdated');
            }
        }
        else {
            taskDue.innerText = `Без крайнего срока сдачи.`;
        }
        taskInfo.appendChild(taskDue);

        document.querySelector('#taskman-actions__submit-body').classList.add('hidden');
        document.querySelector('#taskman-actions__btn-submit').classList.add('hidden');
        document.querySelector('#taskman-actions__btn-delete').classList.add('hidden');

        // Не делаем лишних запросов, если уже известно,
        // что пользователь не отпарвлял посылку.
        if (submitStatus !== undefined) {
            fetch(`../api/board${currentBoard}/task${taskId}/submit`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                //console.log(data);
                const submitDate = new Date(data.date_submitted);
                const submitStatus = data.status;
                const submitText = data.text;

                const submitDateContainer = document.createElement('h1');
                submitDateContainer.innerText = `Посылка от ${submitDate.toLocaleString()}`;
                taskSubmits.appendChild(submitDateContainer);

                const submitStatusContainer = document.createElement('h3');
                submitStatusContainer.className = 'taskman-tasksubmit__status';

                if (submitStatus === 'pending') {
                    submitStatusContainer.innerText = '🐝 На рассмотрении…';
                    submitStatusContainer.classList.add('taskman-tasksubmit__status-pending');
                    document.querySelector('#taskman-actions__btn-delete').classList.remove('hidden');
                }
                else if (submitStatus === 'accepted') {
                    submitStatusContainer.innerText = '🏆 ПРИНЯТО!';
                    submitStatusContainer.classList.add('taskman-tasksubmit__status-accepted');
                }
                else if (submitStatus === 'rejected') {
                    submitStatusContainer.innerText = '🗿 Отклонено';
                    submitStatusContainer.classList.add('taskman-tasksubmit__status-rejected');
                    document.querySelector('#taskman-actions__btn-delete').classList.remove('hidden');
                }
                else {
                    submitStatusContainer.innerText = '⁉️ Неизвестно';
                    document.querySelector('#taskman-actions__btn-delete').classList.remove('hidden');
                }
                taskSubmits.appendChild(submitStatusContainer);

                const submitTextContainer = document.createElement('pre');
                submitTextContainer.className = 'taskman__tasksubmit-text';
                submitTextContainer.innerText = submitText;
                taskSubmits.appendChild(submitTextContainer);
            })
            .catch(error => console.error(error));
        }
        else {
            taskSubmits.innerHTML = '<span class="pale">Вы ещё не отправляли посылку для этой задачи&nbsp;— <br>самое время отправить!</p>';

            document.querySelector('#taskman-actions__submit-body').classList.remove('hidden');
            document.querySelector('#taskman-actions__btn-submit').classList.remove('hidden');
        }
    })
    .catch(error => console.error(error));
}

function taskmanSendSubmit() {
    const token = getToken();
    const submitText = document.querySelector('#taskman-actions__submit-body').value;

    fetch(`../api/board${currentBoard}/task${currentTask}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: submitText })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message !== undefined) { alert(data.message); }

        else {
            alert('Посылка успешно отправлена!');
            document.querySelector('#taskman-actions__submit-body').value = '';
            updateTasklist();
            taskmanGetInfo(currentTask);
        }
    })
    .catch(error => console.error(error));
}

function taskmanDeleteSubmit() {
    const token = getToken();

    if (confirm('Вы уверены, что хотите удалить посылку?')) {
        fetch(`../api/board${currentBoard}/task${currentTask}/submit`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message !== undefined) { alert(data.message); }

            else {
                updateTasklist();
                taskmanGetInfo(currentTask);
            }
        })
        .catch(error => console.error(error));
    }
}
