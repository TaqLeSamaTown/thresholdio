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
            // Cap the input magnitude to 1 to prevent diagonal speed cheating/bugs
            const mag = Math.sqrt(input.x * input.x + input.y * input.y);
            if (mag > 1.5) { 
                players[socket.id].input = { x: (input.x / mag) * 1.5, y: (input.y / mag) * 1.5 };
            } else {
                players[socket.id].input = input;
            }
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
        io.emit("playerDisconnected", socket.id); // Tell client to remove them
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

function resolveCollision(a, b) {
    const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
    const dy = (a.y + a.h / 2) - (b.y + b.h / 2);

    const overlapX = (a.w + b.w) / 2 - Math.abs(dx);
    const overlapY = (a.h + b.h) / 2 - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) return;

    // Push out along the shallowest axis
    if (overlapX < overlapY) {
        const push = overlapX / 2;
        if (dx > 0) {
            a.x += push;
            b.x -= push;
        } else {
            a.x -= push;
            b.x += push;
        }
        // Apply slight bounce
        a.vx *= -0.2;
        b.vx *= -0.2;
    } else {
        const push = overlapY / 2;
        if (dy > 0) {
            a.y += push;
            b.y -= push;
        } else {
            a.y -= push;
            b.y += push;
        }
        a.vy *= -0.2;
        b.vy *= -0.2;
    }
}

setInterval(() => {
    for (const id in players) {
        const p = players[id];
        
        p.vx += p.input.x;
        p.vy += p.input.y;

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= friction;
        p.vy *= friction;

        // Keep inside map bounds
        p.x = Math.max(0, Math.min(p.x, zoneWidth - p.w));
        p.y = Math.max(0, Math.min(p.y, zoneHeight - p.h));

        // Top-zone healing
        if (p.y < 500) {
            p.hp = Math.min(100, p.hp + 0.05);
        }
    }

    const ids = Object.keys(players);
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const p1 = players[ids[i]];
            const p2 = players[ids[j]];

            if (rectColl(p1, p2)) {
                resolveCollision(p1, p2);
                p1.hp = Math.max(0, p1.hp - 0.02);
                p2.hp = Math.max(0, p2.hp - 0.02);
            }
        }
    }

    // Safety check for NaN values
    for (const id in players) {
        const p = players[id];
        if (isNaN(p.x) || isNaN(p.y)) {
            p.x = zoneWidth / 2;
            p.y = zoneHeight / 2;
            p.vx = 0;
            p.vy = 0;
        }
    }
    
    io.emit("state", players);
}, TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
