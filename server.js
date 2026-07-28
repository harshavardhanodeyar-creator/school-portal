const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const db = new sqlite3.Database('./school.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite Database.');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            event_date TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            media_files TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/api/events', (req, res) => {
    db.all(`SELECT * FROM events ORDER BY event_date DESC, id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/events', upload.array('mediaFiles'), (req, res) => {
    const { category, date, title, desc } = req.body;
    const files = req.files ? req.files.map(f => '/uploads/' + f.filename).join(',') : '';

    const sql = `INSERT INTO events (category, event_date, title, description, media_files) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [category, date, title, desc, files], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Event added successfully' });
    });
});

app.delete('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    db.run(`DELETE FROM events WHERE id = ?`, [eventId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Post deleted successfully', changes: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
