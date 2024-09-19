// Функция для создания HTML-элемента формы на основе поля
function createFormElement(field) {
    // Создаем input элемент
    const input = document.createElement('input');
    // Устанавливаем тип input элемента, указанный в параметре field
    input.type = field.type;

    // Если тип поля — checkbox или radio, устанавливаем checked в зависимости от значения по умолчанию
    if (field.type === 'checkbox' || field.type === 'radio') {
        input.checked = !!field.defaultValue; // Преобразуем defaultValue в boolean и присваиваем checked
    }
    // Если тип поля — число, устанавливаем значение по умолчанию или 0
    else if (field.type === 'number') {
        input.value = field.defaultValue || 0; // Если defaultValue не задано, используем 0
    }
    // Для всех других типов полей устанавливаем значение по умолчанию или пустую строку
    else {
        input.value = field.defaultValue || ''; // Если defaultValue не задано, используем пустую строку
    }

    // Если поле обязательно к заполнению, делаем его required
    if (!field.allowEmpty) {
        input.required = true; // Устанавливаем атрибут required для обязательных полей
    }

    // Возвращаем созданный элемент input
    return input;
}

// Основная функция для работы с модальным окном и формой
function modalmanForm(formData, showUploadButton) {

    // Находим кнопку для загрузки файлов
    const button_file = document.getElementById('modalman-files');

    // Если флаг showUploadButton не установлен (значение false или undefined)
    if (!showUploadButton) {
        button_file.style.display = 'none'; // Скрываем кнопку загрузки файлов
    } 
    else {
        // Очищаем выбранный файл, если кнопка для загрузки отображена
        const value_file = document.getElementById('fileInput');
        value_file.value = ""; // Сбрасываем значение input для файлов
        // showFileName(); // Функция для отображения имени файла (если нужно)

        button_file.style.display = 'unset'; // Отображаем кнопку загрузки файлов
    }

    // Возвращаем Promise для асинхронной работы с формой
    return new Promise((resolve) => {
        // Находим модальное окно
        const modalman = document.getElementById('modalman');
        // Генерируем уникальный идентификатор для групп радио-кнопок
        const uname = Math.floor(Math.random() * 100000);

        // Очищаем содержимое модального окна
        const modalmanContent = document.getElementById('modalman__content');
        modalmanContent.innerHTML = '';

        // Проходим по каждому полю в formData и создаем элементы формы
        formData.forEach(field => {
            // Обрабатываем пользовательский тип элементов (например, заголовки или текст)
            if (field.type === 'custom') {
                const text = document.createElement('span');
                text.innerHTML = field.name; // Вставляем HTML-содержимое для пользовательского элемента
                modalmanContent.appendChild(text); // Добавляем текст в модальное окно
            }
            // Если тип элемента textarea, создаем и добавляем соответствующий HTML элемент
            else if (field.type === 'textarea') {
                const input = document.createElement('textarea');
                input.className = 'modalman__input'; // Задаем класс для стилей
                input.innerHTML = field.defaultValue || ''; // Устанавливаем значение по умолчанию

                const text = document.createElement('span');
                text.innerText = field.name; // Добавляем имя поля

                text.appendChild(input); // Вставляем textarea в текстовый элемент
                modalmanContent.appendChild(text); // Добавляем элемент в модальное окно
            }
            else {
                // Создаем стандартные элементы формы (input, checkbox, radio и т.д.)
                const input = createFormElement(field);
                input.className = 'modalman__input'; // Задаем класс для стилей

                const text = document.createElement('span');
                text.innerText = field.name; // Добавляем название поля
                // Если поле обязательно, добавляем красную звездочку
                if (!field.allowEmpty) {
                    text.innerHTML += '<b style="color: red;">*</b>';
                }

                // Устанавливаем уникальное имя для радио-кнопок
                if (field.type === 'radio') {
                    input.name = uname;
                }

                // Создаем label для элементов формы
                const label = document.createElement('label');
                // Для checkbox и radio сначала добавляем input, потом текст
                if (field.type === 'checkbox' || field.type === 'radio') {
                    label.appendChild(input);
                    label.appendChild(text);
                }
                else {
                    // Для остальных полей сначала текст, потом input
                    label.appendChild(text);
                    label.appendChild(input);
                }

                // Добавляем label в модальное окно
                modalmanContent.appendChild(label);
            }
        });

        // Показываем модальное окно
        modalman.showModal();

        // Обрабатываем нажатие на кнопку "Отправить"
        document.getElementById('modalman-actions__send').onclick = () => {
            const results = []; // Массив для хранения результатов
            let valid = true; // Флаг для проверки валидности формы

            // Находим все input элементы формы
            const inputs = document.querySelectorAll('.modalman__input');
            // console.log(inputs); // Выводим список input-ов для отладки

            // Проходим по каждому input элементу
            for (const input of inputs) {
                // Проверяем валидность каждого поля формы
                if (!input.checkValidity()) {
                    valid = false; // Если хотя бы одно поле невалидно, помечаем форму как невалидную
                    input.reportValidity(); // Показываем сообщение о недопустимом значении
                }

                let result = null; // Переменная для хранения результата текущего поля
                // Если поле checkbox или radio, сохраняем значение checked
                if (input.type === 'checkbox' || input.type === 'radio') {
                    result = input.checked;
                }
                // Если поле число, преобразуем значение в число с плавающей точкой
                else if (input.type === 'number') {
                    result = parseFloat(input.value);
                }
                // Для остальных типов сохраняем строковое значение
                else {
                    result = input.value;
                }

                // Добавляем результат текущего поля в массив
                results.push(result);
            }

            // Добавляем файл из скрытого input#fileInput
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length > 0) {
                results.push(fileInput.files[0]); // Добавляем файл
                // formData.append('file', fileInput.files[0]); // Добавляем файл
            }

            // Если форма валидна, завершаем Promise с результатами
            if (valid) {
                console.log('Результирующий массив отправки -> ', results);
                resolve(results); // Возвращаем массив результатов
                modalman.close(); // Закрываем модальное окно
            }
        };

        // Обрабатываем нажатие на кнопку "Отмена"
        document.getElementById('modalman-actions__cancel').onclick = () => {
            resolve(null); // Возвращаем null при отмене
            modalman.close(); // Закрываем модальное окно
        };
    });
}
