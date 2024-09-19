// ЗДЕСЬ ХРАНЯТСЯ ФУНКЦИИ ПОЛУЧЕНИЯ ДОСТУПА К БД И ИХ ПРОТОТИПЫ
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');



if (!fs.existsSync('./data')) {
    console.warn('[!!!] Общая директория данных не найдена!');
    fs.mkdirSync('./data', { recursive: true });
}



function getUsers() {
    if (!fs.existsSync('./data/users.sqlite')) {
        console.warn('[!!!] База данных пользователей не найдена.');
    }

    const db = new sqlite3.Database('./data/users.sqlite');

    db.serialize(() => {
        db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )`);
    });

    return db;
}

function getBoards() {
    if (!fs.existsSync('./data/boards.sqlite')) {
        console.warn('[!!!] База данных досок не найдена.');
    }

    const db = new sqlite3.Database('./data/boards.sqlite');

    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS boards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                user_creator INTEGER NOT NULL
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS board_configs (
                board_id INTEGER PRIMARY KEY NOT NULL,
                submits_autoaccept INTEGER DEFAULT 0,
                submits_body_size INTEGER DEFAULT 0,
                submits_strict_due_date INTEGER DEFAULT 0
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS board_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                board_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL
            )
        `);
    });

    return db;
}

// ALTER TABLE table_name ADD new_column_name column_definition; table_name
function getBoardData(board_id) {
    if (!fs.existsSync('./data/boards/' + board_id + '/data.sqlite')) {
        console.warn(`[!!!] База данных доски ${board_id} не найдена.`);
        if (!fs.existsSync('./data/boards/data')) {
            fs.mkdirSync('./data/boards/' + board_id, { recursive: true });
        }
    }

    const db = new sqlite3.Database('./data/boards/' + board_id + '/data.sqlite');

    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT,
                date_due TEXT,
                file_name TEXT,
                file_path TEXT
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS task_submits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                date_submitted TEXT NOT NULL,
                text TEXT,
                status TEXT NOT NULL,
                file_name TEXT,
                file_path TEXT
            )
        `);
    });

    return db;
}



module.exports = {
    getUsers,
    getBoards,
    getBoardData
}
