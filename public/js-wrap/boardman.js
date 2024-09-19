var currentBoard = null;

function toggleBoardmanView() {
    document.querySelectorAll(".boardman-spacer").forEach(e => e.classList.toggle('closed'));
    document.querySelector("#boardman-wrapper").classList.toggle('closed');
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
function createBoardmanBoard(data) {
    const token = getToken();

    const boardContainerState = document.createElement('input');
    boardContainerState.className = 'boardman-item-state';
    boardContainerState.type = 'radio';
    boardContainerState.name = 'boardman-state';

    const boardContainer = document.createElement('label');
    boardContainer.className = 'boardman-item text-clip';
    boardContainer.innerText = data.name;
    boardContainer.title = data.description;

    // Несмотря на скрытие в CSS, JS назначает таргет и для
    // input, и для label, поэтому если бы здесь был boardContainer,
    // фукнция по click вызывалась бы ДВАЖДЫ... это JS, детка!
    boardContainerState.onclick = () => {
        closeTaskmanView();

        currentBoard = data.id;
        setLastBoard(currentBoard);
        document.querySelector('#groupinfo__title').innerText = data.description;

        updateTasklist();
    }

    // Эта логика нужна при первой инициализации boardman
    // для корректной обработки currentBoard из getLastBoard().
    if (data.id === +currentBoard) {
        boardContainerState.checked = true;
        document.querySelector('#groupinfo__title').innerText = data.description;
    }

    boardContainer.appendChild(boardContainerState);
    boardman.appendChild(boardContainer);
}

function updateBoardman() {
    const token = getToken();
    const boardman = document.querySelector('#boardman');

    fetch(`../api/boards`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        boardman.innerHTML = '';

        //console.log(data);
        if (data.length > 0) {
            for (const boardData of data) {
                createBoardmanBoard(boardData);
            }
        }
        else {
            boardman.innerHTML = '<span class="pale">У вас пока нет ни одной доски. Попросите оператора добавить вас в нужные доски, либо, если вы оператор, создайте новую.</span>';
        }
    })
    .catch(error => console.error(error));
}



// ФУНКЦИИ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ОПЕРАТОРА
function boardmanNewBoard() {
    const token = getToken();

    const formData = [
        { name: '<h2>Создание новой доски</h2>', type: 'custom' },
        { name: 'Название доски', type: 'text', allowEmpty: false },
        { name: 'Описание доски (видно сверху)', type: 'text', allowEmpty: true },
        { name: '<h2>Параметры посылок</h2>', type: 'custom' },
        { name: 'Автоматически принимать отправленные посылки', type: 'checkbox', allowEmpty: true },
        { name: 'Минимальная длина посылки (0 для отключения)', type: 'number', allowEmpty: false },
        { name: 'Запретить сдачу посылок после истечения даты', type: 'checkbox', allowEmpty: true },
    ];

    modalmanForm(formData, false)
    .then(formResults => {
        if (!formResults) { return; }

        fetch(`../api/boards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: formResults[0],
                description: formResults[1],
                configSubmitsAutoaccept: formResults[2],
                configSubmitsBodySize: formResults[3],
                configSubmitsStrictDueDate: formResults[4]
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) { alert(data.message); }

            else {
                currentBoard = data.id;
                setLastBoard(currentBoard);
                updateBoardman();
                updateTasklist();
            }
        })
        .catch(error => console.error(error));
    });
}


function boardmanEditBoard() {
    const token = getToken();

    fetch(`../api/board${currentBoard}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        //console.log(data);
        const formData = [
            { name: '<h2>Параметры доски</h2>', type: 'custom' },
            { name: 'Название доски', type: 'text', defaultValue: data.board.name, allowEmpty: false },
            { name: 'Описание доски (видно сверху)', type: 'text', defaultValue: data.board.description, allowEmpty: true },
            { name: '<h2>Параметры посылок</h2> <i>Изменение параметров не затронет старые посылки.</i>', type: 'custom' },
            { name: 'Автоматически принимать отправленные посылки', type: 'checkbox', defaultValue: data.config.submits_autoaccept, allowEmpty: true },
            { name: 'Минимальная длина посылки (0 для отключения)', type: 'number', defaultValue: data.config.submits_body_size, allowEmpty: false },
            { name: 'Запретить сдачу посылок после истечения даты', type: 'checkbox', defaultValue: data.config.submits_strict_due_date, allowEmpty: true },
        ];

        modalmanForm(formData, false)
        .then(formResults => {
            if (!formResults) { return; }

            fetch(`../api/board${currentBoard}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formResults[0],
                    description: formResults[1],
                    configSubmitsAutoaccept: formResults[2],
                    configSubmitsBodySize: formResults[3],
                    configSubmitsStrictDueDate: formResults[4]
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) { alert(data.message); }

                else {
                    currentBoard = data.id;
                    updateBoardman();
                    updateTasklist();
                }
            })
            .catch(error => console.error(error));
        });
    })
    .catch(error => console.error(error));
}

function boardmanDeleteBoard() {
    const token = getToken();

    if (confirm("Вы уверены, что хотите удалить ЦЕЛУЮ ДОСКУ!?")) {
        fetch(`../api/board${currentBoard}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) { alert(data.message); }

            else {
                clearLastBoard();
                currentBoard = null;
                updateBoardman();
                updateTasklist();
            }
        })
        .catch(error => console.error(error));
    }
}

function boardmanBoardMembers() {
    const token = getToken();

    fetch(`../api/board${currentBoard}/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message !== undefined) {
            alert(data.message);
            return;
        }

        let usersInfo = [];
        const fetchUserPromises = data.map(userId =>
            fetch(`../api/user${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(response => response.json())
        );

        Promise.all(fetchUserPromises)
        .then(users => {
            users.forEach(user => {
                usersInfo.push({ id: user.id, username: user.username, displayName: user.display_name });
            });

            const formData = [
                { name: '<h2>Управление участниками</h2> <i>Выберите участника для УДАЛЕНИЯ, либо добавьте нового.</i>', type: 'custom' },
                ...usersInfo.map(user => ({
                    name: `${user.displayName} (${user.username})`,
                    type: 'radio',
                    allowEmpty: false
                })),
                { name: '<i>Удаление участника не затронет отправленные им посылки.</i>', type: 'custom' },
                { name: '➕ Новый участник', type: 'radio', value: 'new', allowEmpty: false }
            ];

            modalmanForm(formData, false).then(formResults => {
                if (!formResults) { return };

                const selectedIndex = formResults.findIndex(value => value === true);
                if (selectedIndex === -1) { return };

                const selectedUserId = (selectedIndex < usersInfo.length) ? usersInfo[selectedIndex].id : 'new';

                if (selectedUserId === 'new') {
                    const searchQuery = prompt('Введите имя или логин пользователя для поиска:');
                    if (!searchQuery) { return };

                    fetch(`../api/users/find?q=${encodeURIComponent(searchQuery)}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.length === 0) {
                            alert('По вашему запросу не найдено ни одного участника.');
                            boardmanBoardMembers();
                        }

                        const usersInfo = data.map(user => ({
                            id: user.id,
                            displayName: user.display_name,
                            username: user.username
                        }));

                        const searchResultsForm = [
                            { name: `<h2>Добавление нового участника</h2> <i>По вашему запросу найдено ${usersInfo.length} участник(ов):</i>`, type: 'custom' },
                            ...usersInfo.map(user => ({
                                name: `${user.displayName} (${user.username})`,
                                type: 'radio',
                                allowEmpty: false
                            }))
                        ];

                        modalmanForm(searchResultsForm, false).then(searchResults => {
                            if (!searchResults) { return };

                            const selectedSearchIndex = searchResults.findIndex(value => value === true);
                            if (selectedSearchIndex === -1) { return };

                            const selectedUserToAdd = usersInfo[selectedSearchIndex];
                            if (!selectedUserToAdd) { return };

                            fetch(`../api/board${currentBoard}/user${selectedUserToAdd.id}`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.message) { alert(data.message); }

                                else { boardmanBoardMembers(); }
                            })
                            .catch(error => console.error(error));
                        });
                    })
                    .catch(error => console.error(error));
                } else {
                    fetch(`../api/board${currentBoard}/user${selectedUserId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) { alert(data.message); }

                        else { boardmanBoardMembers(); }
                    })
                    .catch(error => console.error(error));
                }
            });
        })
        .catch(error => console.error(error));
    })
    .catch(error => console.error(error));
}
