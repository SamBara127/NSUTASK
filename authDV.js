// ЗДЕСЬ ХРАНЯТСЯ ПЕРМЕННЫЕ КОНФИГУРАЦИИ И ФУНКЦИИ ВАЛИДАЦИИ АУТЕНТИФИКАЦИИ
const express = require('express');
const jwt = require('jsonwebtoken');

const DB = require('./databases');



ALLOW_CREATING_OPERATORS = true; // Если false, значение поля 'role' будет переопределяться на 'user'
AUTH_SECRET = '12345678901234567890'; // Используется JWT для шифровки токенов
AUTH_EXPIRATION = '24h'; // Устанавливает время действия токена

if (ALLOW_CREATING_OPERATORS) { console.warn('[!!!] Разрешено несанкционированное создание операторов.'); }



function validate_user(req, res, next) {
    const token_raw = req.headers['authorization'];
    //console.log(token_raw);
    if (!token_raw) { return res.status(401).json({ message: 'Пожалуйста, авторизируйтесь.' }); }

    const token = token_raw.split(' ')[1];

    jwt.verify(token, AUTH_SECRET, (err, user) => {
        if (err) { return res.status(401).json({ message: 'Этот токен сессии устарел или недействителен.' }); }

        req.user = user;
        next();
    });
}

function validate_operator(req, res, next) {
    validate_user(req, res, () => {
        // Мы НЕ ХРАНИМ роль пользователя в токене сессии из соображений безопасности,
        // поэтому проверка осуществляется прямо в базе данных. Медленнее, зато безопаснее!
        const db = DB.getUsers();

        db.get(
            `SELECT * FROM users WHERE id = ? AND role = 'operator'`,
            [req.user.id],
            (err, row) => {
                if (err) { return res.status(500).json({ message: err.message }); }
                if (!row) { return res.status(403).json({ message: 'У вас нет прав для выполнения этого действия.' }); }

                next();
            }
        );
    });
}



module.exports = {
    ALLOW_CREATING_OPERATORS,
    AUTH_SECRET,
    AUTH_EXPIRATION,
    validate_user,
    validate_operator
}
