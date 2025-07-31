const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

let userVideoDir = '';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

app.post('/api/set-folder', (req, res) => {
    const { folderPath } = req.body;
    if (!fs.existsSync(folderPath)) return res.status(400).send('Invalid path');
    userVideoDir = folderPath;
    res.sendStatus(200);
});

app.get('/api/videos', (req, res) => {
    if (!userVideoDir) return res.json([]);
    const files = fs.readdirSync(userVideoDir)
        .filter(file => file.endsWith('.mp4'));
    res.json(files);
});

app.get('/stream/:filename', (req, res) => {
    const filePath = path.join(userVideoDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

        const stream = fs.createReadStream(filePath, { start, end });
        const headers = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, headers);
        stream.pipe(res);
    } else {
        const headers = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
    }
});

app.get('/api/progress', (req, res) => {
    if (!fs.existsSync(PROGRESS_FILE)) fs.writeFileSync(PROGRESS_FILE, '{}');
    const data = fs.readFileSync(PROGRESS_FILE);
    res.json(JSON.parse(data));
});

app.post('/api/progress', (req, res) => {
    const { filename, time } = req.body;
    let data = {};
    if (fs.existsSync(PROGRESS_FILE)) {
        data = JSON.parse(fs.readFileSync(PROGRESS_FILE));
    }
    if (!data.timestamps) data.timestamps = {};
    data.timestamps[filename] = time;
    data.lastPlayed = filename;

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
