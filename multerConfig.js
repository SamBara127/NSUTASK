const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Функция для создания директории
function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Настройка multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const boardId = req.params.board_id;
        const uploadPath = path.join(__dirname, 'uploads', boardId);

        try {
            ensureDirSync(uploadPath);
            cb(null, uploadPath);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        // cb(null, file.originalname);

        // Генерация уникального имени файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Экспортируем middleware для обработки одного файла
const upload = multer({ storage: storage }).single('file');

module.exports = upload;
