const express = require('express');
const router = express.Router();

const sqlite3 = require('sqlite3').verbose();
const DB = require('../databases');

const upload = require('../multerConfig');  // Импортируем настройку multer
const path = require('path');

const fs = require('fs');



// МЕТОДЫ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
router.getBoardTasks = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.all(
                `SELECT tasks.*, COUNT(task_submits.id) AS submits_count FROM tasks
                LEFT JOIN task_submits ON tasks.id = task_submits.task_id
                GROUP BY tasks.id ORDER BY tasks.id DESC`,
                (err, rows) => {
                    if (err) { return res.status(500).json({ message: err.message }); }

                    return res.status(200).json(rows);
                }
            );
        }
    );
};

router.getTaskInfo = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.get(
                `SELECT tasks.*, COUNT(task_submits.id) AS submit_count FROM tasks
                LEFT JOIN task_submits ON tasks.id = task_submits.task_id
                WHERE tasks.id = ? GROUP BY tasks.id`,
                [taskId],
                (err, row) => {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (!row) { return res.status(404).json({ message: 'Такой задачи не существует.' }); }

                    res.status(200).json(row);
                }
            );
        }
    );
};



// МЕТОДЫ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ОПЕРАТОРА
router.createTask = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id;
    // const { title, body, dateDue} = req.body;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    // Вызываем middleware multer для загрузки файла
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).json({ message: 'Ошибка при загрузке файла.' });
        }

        // Проверяем, является ли пользователь участником доски
        boardsDb.get(
            `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
            [boardId, userId],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (!row) {
                    return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' });
                }

                ///

                const { title, body, dateDue} = req.body;

                const dateCreated = new Date().toISOString();
                if (dateDue !== 'null' && isNaN(new Date(dateDue))) {
                    return res.status(400).json({ message: 'Некорретный формат даты срока выполнения.' });
                }
                if (dateDue !== 'null' && (new Date(dateDue) < (new Date(dateCreated) - 2048000000))) { 
                    return res.status(400).json({ message: 'Дата срока выполнения не может быть в прошлом.' });
                }

                console.log('Title:', title);
                console.log('Body:', body);
                console.log('DateDue:', dateDue);

                ///

                // Добавляем информацию о файле, если он был загружен
                const filePath = req.file ? path.join('uploads', boardId, req.file.filename) : null;
                const filename_original = req.file ? req.file.originalname : null;
                if (filePath == null) console.log('НЕТУ ФАЙЛА!!!'); else console.log('ОБНАРУЖЕН ФАЙЛ!!! -> ', filePath);

                // Вставляем задачу в базу данных
                dataDb.run(
                    `INSERT INTO tasks (title, body, date_due, file_name, file_path) VALUES (?, ?, ?, ?, ?)`,
                    [title, body, dateDue, filename_original, filePath],
                    function (err) {
                        if (err) {
                            return res.status(500).json({ message: err.message });
                        }

                        const newTaskId = this.lastID;
                        res.status(201).json({ id: newTaskId });
                    }
                );
            }
        );
    });
};

router.editTaskInfo = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    // Вызываем middleware multer для загрузки файла
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).json({ message: 'Ошибка при загрузке файла.' });
        }

        boardsDb.get(
            `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
            [boardId, userId],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (!row) {
                    return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' });
                }

                const { title, body, dateDue } = req.body;

                const dateCreated = new Date().toISOString();
                if (dateDue !== 'null' && isNaN(new Date(dateDue))) {
                    return res.status(400).json({ message: 'Некорретный формат даты срока выполнения.' });
                }
                if (dateDue !== 'null' && (new Date(dateDue) < (new Date(dateCreated) - 2048000000))) { 
                    return res.status(400).json({ message: 'Дата срока выполнения не может быть в прошлом.' });
                }

                // Получаем текущий путь к файлу для удаления, если требуется
                dataDb.get(
                    `SELECT file_path, file_name FROM tasks WHERE id = ?`,
                    [taskId],
                    (err, taskRow) => {
                        if (err) {
                            return res.status(500).json({ message: 'Ошибка при получении данных задачи.' });
                        }

                        const oldFilePath = taskRow ? taskRow.file_path : null;
                        const oldFileName = taskRow ? taskRow.file_name : null;

                        // Проверяем, был ли загружен новый файл
                        let filePath = oldFilePath;
                        let filename_original = oldFileName;
                        
                        if (req.file) {
                            filePath = path.join('uploads', boardId, req.file.filename);
                            filename_original = req.file.originalname;
                        }

                        // Формируем SQL-запрос динамически
                        let sql = `UPDATE tasks SET title = ?, body = ?, date_due = ?`;
                        const params = [title, body, dateDue];

                        if (req.file) {
                            sql += `, file_name = ?, file_path = ?`;
                            params.push(filename_original, filePath);
                        }

                        sql += ` WHERE id = ?`;
                        params.push(taskId);

                        // Обновляем информацию о задаче в базе данных
                        dataDb.run(sql, params, function (err) {
                            if (err) {
                                return res.status(500).json({ message: err.message });
                            }
                            if (this.changes === 0) {
                                return res.status(404).json({ message: 'Такой задачи не существует.' });
                            }

                            // Удаляем старый файл, если был загружен новый
                            if (req.file && oldFilePath) {
                                fs.unlink(oldFilePath, (err) => {
                                    if (err) {
                                        console.error('Ошибка при удалении старого файла:', err);
                                    }
                                });
                            }

                            return res.status(200).json({ id: taskId });
                        });
                    }
                );
            }
        );
    });
};

router.deleteTask = (req, res) => {
    const userId = req.user.id;
    const boardId = req.params.board_id;
    const taskId = req.params.task_id;
    const boardsDb = DB.getBoards();
    const dataDb = DB.getBoardData(boardId);

    // Проверяем, является ли пользователь участником доски
    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (!row) {
                return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' });
            }

            // Извлекаем информацию о задаче для получения пути к файлу
            dataDb.get(
                `SELECT file_path FROM tasks WHERE id = ?`,
                [taskId],
                (err, task) => {
                    if (err) {
                        return res.status(500).json({ message: err.message });
                    }
                    if (!task) {
                        return res.status(404).json({ message: 'Такой задачи не существует.' });
                    }

                    // Удаляем задачу из базы данных
                    dataDb.run(
                        `DELETE FROM tasks WHERE id = ?`,
                        [taskId],
                        function (err) {
                            if (err) {
                                return res.status(500).json({ message: err.message });
                            }
                            if (this.changes === 0) {
                                return res.status(404).json({ message: 'Такой задачи не существует.' });
                            }

                            // Удаляем файл, если он существует
                            if (task.file_path) {
                                fs.unlink(task.file_path, (err) => {
                                    if (err) {
                                        console.error('Ошибка при удалении файла:', err);
                                    }
                                    // Возвращаем успешный ответ
                                    return res.status(200).json({ id: taskId });
                                });
                            } else {
                                // Если файл отсутствует, возвращаем успешный ответ
                                return res.status(200).json({ id: taskId });
                            }
                        }
                    );
                }
            );
        }
    );
};

// router.downloadTask = (req, res) => {
//     console.log("I CATCHED YOUR REQUEST!!!!!, UUUUUUIIIIIIIIIIIII)))), I M SENDIND RESPONSE...");
//     res.end("I CATCHED RESPONSE!!!!!, UUUUUUIIIIIIIIIIIII)))), GOOD JOB!");
// }
// Контроллер для скачивания файла по task_id
router.downloadTask = (req, res) => {
    const { board_id, task_id } = req.params;
    const dataDb = DB.getBoardData(board_id);  // Предположим, что здесь ты работаешь с базой данных

    // Находим информацию о задаче
    dataDb.get(`SELECT file_path, file_name FROM tasks WHERE id = ?`, [task_id], (err, taskRow) => {
        if (err) {
            return res.status(500).json({ message: 'Ошибка при получении данных задачи.' });
        }

        if (!taskRow || !taskRow.file_path) {
            return res.status(404).json({ message: 'Файл не найден для данной задачи.' });
        }

        const filePath = taskRow.file_path;
        const fileName = taskRow.file_name;

        // Проверяем, существует ли файл на сервере
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ message: 'Файл не найден на сервере.' });
            }
            
            // Отправляем файл клиенту
            res.download(filePath, fileName, (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Ошибка при скачивании файла.' });
                }
            });
        });
    });
};



module.exports = router;
