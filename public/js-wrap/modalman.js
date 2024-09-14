function createFormElement(field) {
    const input = document.createElement('input');
    input.type = field.type;

    if (field.type === 'checkbox' || field.type === 'radio') {
        input.checked = !!field.defaultValue;
    }
    else if (field.type === 'number') {
        input.value = field.defaultValue || 0;
    }
    else {
        input.value = field.defaultValue || '';
    }

    if (!field.allowEmpty) { input.required = true; }
    return input;
}

function modalmanForm(formData) {
    return new Promise((resolve) => {
        const modalman = document.getElementById('modalman');
        const uname = Math.floor(Math.random() * 100000); // Уникальный временный name для радио-кнопок

        const modalmanContent = document.getElementById('modalman__content');
        modalmanContent.innerHTML = '';
        formData.forEach(field => {
            // Пользовательский тип элемента, позволяет
            // делать вставки html (например, для создания
            // заголовков или обычного текста).
            if (field.type === 'custom') {
                const text = document.createElement('span');
                text.innerHTML = field.name;

                modalmanContent.appendChild(text);
            }
            // Отдельная обработка textarea ввиду того,
            // что это (почему-то) отдельный независимый
            // html-элемент, а не тип input-а.
            else if (field.type === 'textarea') {
                const input = document.createElement('textarea');
                input.className = 'modalman__input';
                input.innerHTML = field.defaultValue || '';

                const text = document.createElement('span');
                text.innerText = field.name;

                text.appendChild(input);
                modalmanContent.appendChild(text);
            }
            else {
                const input = createFormElement(field);
                input.className = 'modalman__input';

                const text = document.createElement('span');
                text.innerText = field.name;
                // Маркируем обязательные поля звЕздочкой
                if (!field.allowEmpty) {
                    text.innerHTML += '<b style="color: red;">*</b>';
                }

                // Уникальный временный name для радио-кнопок
                if (field.type === 'radio') {
                    input.name = uname;
                }

                const label = document.createElement('label');
                if (field.type === 'checkbox' || field.type === 'radio') {
                    label.appendChild(input);
                    label.appendChild(text);
                }
                else {
                    label.appendChild(text);
                    label.appendChild(input);
                }

                modalmanContent.appendChild(label);
            }
        });
        modalman.showModal();

        document.getElementById('modalman-actions__send').onclick = () => {
            const results = [];
            let valid = true;

            const inputs = document.querySelectorAll('.modalman__input');
            //console.log(inputs);

            for (const input of inputs) {
                // Из-за resolve-а стандартный валидатор форм
                // не работает, поэтому сделаем свою валидацию...
                if (!input.checkValidity()) {
                    valid = false;
                    input.reportValidity();
                }

                let result = null;
                if (input.type === 'checkbox' || input.type === 'radio') {
                    result = input.checked;
                }
                else if (input.type === 'number') {
                    result = parseFloat(input.value);
                }
                else {
                    result = input.value;
                }

                results.push(result);
            }

            if (valid) {
                resolve(results);
                modalman.close();
            }
        };

        document.getElementById('modalman-actions__cancel').onclick = () => {
            resolve(null);
            modalman.close();
        };
    });
}
