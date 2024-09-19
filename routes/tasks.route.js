const express = require('express');
const router = express.Router();

const tasksController = require('../controllers/tasks.controller');
const authDV = require('../authDV');


router.get('/board:board_id/tasks', authDV.validateUser, tasksController.getBoardTasks);
router.get('/board:board_id/task:task_id', authDV.validateUser, tasksController.getTaskInfo);

router.post('/board:board_id/tasks', authDV.validateOperator, tasksController.createTask);
router.put('/board:board_id/task:task_id', authDV.validateOperator, tasksController.editTaskInfo);
router.delete('/board:board_id/task:task_id', authDV.validateOperator, tasksController.deleteTask);

// router.get('/board:board_id/task:task_id/download', authDV.validateUser, tasksController.downloadTask);
// router.get('/test', tasksController.downloadTask);
router.get('/board:board_id/task:task_id/download', tasksController.downloadTask);

module.exports = router;
