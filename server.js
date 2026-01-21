const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public (client)")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public (client)", "index.html"));
});

const zoneWidth = 3000;
const zoneHeight = 4500;
const friction = 0.9;
const TICK_RATE = 1000 / 60;

const players = {};

io.on("connection", socket => {
    const defaultUsername = "Sama no. " + Math.floor(Math.random() * 100);
    players[socket.id] = {
        x: zoneWidth / 2,
        y: zoneHeight / 2,
        w: 20,
        h: 20,
        vx: 0,
        vy: 0,
        hp: 100,
        input: { x: 0, y: 0 },
        username: defaultUsername
    };

    socket.emit("state", players);

    socket.on("move", input => {
        if (players[socket.id]) {
            players[socket.id].input = input;
        }
    });

    socket.on("chat", msg => {
        if (!players[socket.id]) return;
        io.emit("chat", {
            username: players[socket.id].username,
            message: msg
        });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });
});

function rectColl(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

setInterval(() => {
    for (const id in players) {
        const p = players[id];
        let speed = 1.5;

        p.vx += p.input.x * speed;
        p.vy += p.input.y * speed;

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= friction;
        p.vy *= friction;

        p.x = Math.max(0, Math.min(p.x, zoneWidth - p.w));
        p.y = Math.max(0, Math.min(p.y, zoneHeight - p.h));

        for (const id2 in players) {
            if (id === id2) continue;
            const p2 = players[id2];
            if (rectColl(p2, p)) {
                p.vx = -5;
				p.vy = -5;
            }
        }

        if (p.y < 500) {
            p.hp = Math.min(100, p.hp + 0.05);
        }
    }

    io.emit("state", players);
}, TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
