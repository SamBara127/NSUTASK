const express = require('express');
const router = express.Router();
const fs = require('fs');

const sqlite3 = require('sqlite3').verbose();
const DB = require('../databases');
const authDV = require('../authDV');



// МЕТОДЫ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ПОЛЬЗОВАТЕЛЯ
router.getBoardSubmits = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.all(
                `SELECT task_id, status FROM task_submits WHERE task_submits.user_id = ?`,
                [userId],
                (err, rows) => {
                    if (err) { return res.status(500).json({ message: err.message }); }

                    return res.status(200).json(rows);
                }
            );
        }
    );
}

router.getSubmitInfo = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.get(
                `SELECT * FROM task_submits WHERE task_submits.user_id = ? AND task_submits.task_id = ?`,
                [userId, taskId],
                (err, row) => {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (!row) { return res.status(404).json({ message: 'Такой посылки не существует, либо не существует такой задачи.' }); }

                    return res.status(200).json(row);
                }
            );
        }
    );
};

router.createSubmit = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const txt = req.body.body;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            const boardConfigs = {};
            boardsDb.get(
                `SELECT * FROM board_configs WHERE board_id = ?`,
                [boardId],
                (err, row) => {
                    //console.log(row);
                    boardConfigs.submits_autoaccept = row.submits_autoaccept;
                    boardConfigs.submits_body_size = row.submits_body_size;
                    boardConfigs.submits_strict_due_date = row.submits_strict_due_date;

                    if (((txt === undefined) && (boardConfigs.submits_body_size > 0))
                        || (txt.length < boardConfigs.submits_body_size)) {
                        return res.status(400).json({ message: 'Посылка для этой задачи должна содержать не менее ' + boardConfigs.submits_body_size + ' символов.' });
                    }

                    dataDb.get(
                        `SELECT * FROM tasks WHERE id = ?`,
                        [taskId],
                        (err, row) => {
                            if (err) { return res.status(500).json({ message: err.message }); }
                            if (!row) { return res.status(404).json({ message: 'Такой задачи не существует.' }); }

                            const dateSubmitted = new Date().toISOString();
                            if (boardConfigs.submits_strict_due_date) {
                                if (new Date(row.date_due) < new Date(dateSubmitted)) {
                                    return res.status(400).json({ message: 'Для этой задачи посылки больше не принимаются. Сожалеем.' });
                                }
                            }

                            dataDb.get(
                                `SELECT * FROM task_submits WHERE user_id = ? AND task_id = ?`,
                                [userId],
                                (err, row) => {
                                    if (err) { return res.status(500).json({ message: err.message }); }
                                    if (row) { return res.status(409).json({ message: 'Вы уже отправляли посылку для этой задачи. Пожалуйста, сперва удалите предыдущую.' }); }

                                    const status = boardConfigs.submits_autoaccept ? 'accepted' : 'pending';

                                    dataDb.run(
                                        `INSERT INTO task_submits (user_id, task_id, date_submitted, text, status) VALUES (?, ?, ?, ?, ?)`,
                                        [userId, taskId, dateSubmitted, txt, status],
                                        function(err) {
                                            if (err) { return res.status(500).json({ message: err.message }); }

                                            return res.status(201).json({ id: userId });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

router.deleteSubmit = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.get(
                `SELECT status FROM task_submits WHERE user_id = ? AND task_id = ?`,
                [userId, taskId],
                (err, row) => {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (!row) { return res.status(404).json({ message: 'Вы ещё не отправляли посылку для этой задачи.' }); }

                    if (row.status === 'accepted') {
                        return res.status(400).json({ message: 'Ваша посылка была принята, теперь её нельзя удалить.' });
                    }

                    else {
                        dataDb.run(
                            `DELETE FROM task_submits WHERE user_id = ? AND task_id = ?`,
                            [userId, taskId],
                            function(err) {
                                if (err) { return res.status(500).json({ message: err.message }); }
                                if (this.changes === 0) { return res.status(404).json({ message: 'Вы ещё не отправляли посылку для этой задачи.' }); }

                                return res.status(200).json({ id: userId });
                            }
                        );
                    }
                }
            );
        }
    );
};



// МЕТОДЫ НИЖЕ ТРЕБУЮТ ПРИВИЛЕГИЙ ОПЕРАТОРА
router.getTaskSubmits = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.all(
                `SELECT * FROM task_submits WHERE task_id = ?`,
                [taskId],
                (err, rows) => {
                    if (err) { return res.status(500).json({ message: err.message }); }

                    return res.status(200).json(rows.map(row => row.id));
                }
            );
        }
    );
};

router.getTaskSubmit = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id, submitId = req.params.submit_id;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId), usersDb = DB.getUsers();

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.get(
                `SELECT * FROM task_submits WHERE id = ? AND task_id = ?`,
                [submitId, taskId],
                (err, submitRow) => {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (!submitRow) { return res.status(404).json({ message: 'Такой посылки не существует, либо не существует такой задачи.' }); }

                    const submitUserId = submitRow.user_id;

                    usersDb.get(
                        `SELECT username, display_name FROM users WHERE id = ?`,
                        [submitUserId],
                        (err, userRow) => {
                            if (err) { return res.status(500).json({ message: err.message }); }
                            if (!userRow) { return res.status(404).json({ message: 'Пользователь не найден.' }); }

                            const response = {
                                ...submitRow,
                                username: userRow.username,
                                display_name: userRow.display_name
                            };

                            return res.status(200).json(response);
                        }
                    );
                }
            );
        }
    );
};

router.setSubmitStatus = (req, res) => {
    const userId = req.user.id, boardId = req.params.board_id, taskId = req.params.task_id, submitId = req.params.submit_id;
    const status = req.body.status;
    const boardsDb = DB.getBoards(), dataDb = DB.getBoardData(boardId);

    if (!['accepted', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Указан некорректный новый статус посылки.' });
    }

    boardsDb.get(
        `SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
        [boardId, userId],
        (err, row) => {
            if (err) { return res.status(500).json({ message: err.message }); }
            if (!row) { return res.status(404).json({ message: 'Такой доски не существует, либо вы не являетесь её участником.' }); }

            dataDb.get(
                `SELECT status FROM task_submits WHERE id = ? AND task_id = ?`,
                [submitId, taskId],
                (err, row) => {
                    if (err) { return res.status(500).json({ message: err.message }); }
                    if (!row) { return res.status(404).json({ message: 'Такой посылки не существует, либо не существует такой задачи.' }); }

                    dataDb.run(
                        `UPDATE task_submits SET status = ? WHERE id = ? AND task_id = ?`,
                        [status, submitId, taskId],
                        function(err) {
                            if (err) { return res.status(500).json({ message: err.message }); }

                            return res.status(200).json({ id: submitId });
                        }
                    );
                }
            );
        }
    );
};



module.exports = router;
