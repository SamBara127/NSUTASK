const express = require('express');
const router = express.Router();

const sqlite3 = require('sqlite3').verbose();
const DB = require('../databases');



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
    const { title, body, dateDue } = req.body;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    const dateCreated = new Date().toISOString();
    if (dateDue && isNaN(new Date(dateDue))) {
        return res.status(400).json({ message: 'Некорретный формат даты срока выполнения.' });
    }
    if (dateDue && (new Date(dateDue) < (new Date(dateCreated) - 2048000000))) { // Задачу можно создать со сроком сдачи в этот же день!
        return res.status(400).json({ message: 'Дата срока выполнения не может быть в прошлом.' });
    }

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.run(
                `INSERT INTO tasks (title, body, date_due) VALUES (?, ?, ?)`,
                [title, body, dateDue],
                function (err) {
                    if (err) { return res.status(500).json({ message: err.message }); }

                    const newTaskId = this.lastID;
                    res.status(201).json({ id: newTaskId });
                }
            );
        }
    );
};

router.editTaskInfo = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const { title, body, dateDue } = req.body;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    const dateCreated = new Date().toISOString();
    if (dateDue && isNaN(new Date(dateDue))) {
        return res.status(400).json({ message: 'Некорретный формат даты срока выполнения.' });
    }
    if (dateDue && (new Date(dateDue) < (new Date(dateCreated) - 2048000000))) { // Задачу можно создать со сроком сдачи в этот же день!
        return res.status(400).json({ message: 'Дата срока выполнения не может быть в прошлом.' });
    }

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.run(
                `UPDATE tasks SET title = ?, body = ?, date_due = ? WHERE id = ?`,
                [title, body, dateDue, taskId],
                function(err) {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (this.changes === 0) { return res.status(404).json({ message: 'Такой задачи не существует.' }); }

                    return res.status(200).json({ id: taskId });
                }
            );
        }
    );
};

router.deleteTask = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.run(
                `DELETE FROM tasks WHERE id = ?`,
                [taskId],
                function (err) {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (this.changes === 0) { return res.status(404).json({ message: 'Такой задачи не существует.' }); }

                    return res.status(200).json({ id: taskId });
                }
            );
        }
    );
};



module.exports = router;
