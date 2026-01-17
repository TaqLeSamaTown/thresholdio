const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const players = {};
let myId = null;

const zoneWidth = 3000;
const zoneHeight = 4500;
const renderDistance = 1600;

const input = { x: 0, y: 0 };
const camera = { x: 0, y: 0 };

socket.on("connect", () => {
    myId = socket.id;
});

socket.on("state", serverPlayers => {
    for (let id in serverPlayers) {
        players[id] = serverPlayers[id];
    }
});

window.addEventListener("keydown", e => {
    if (e.key === "a") input.x = -1;
    if (e.key === "d") input.x = 1;
    if (e.key === "w") input.y = 1;
    if (e.key === "s") input.y = -1;
});

window.addEventListener("keyup", e => {
    if (["a", "d"].includes(e.key)) input.x = 0;
    if (["w", "s"].includes(e.key)) input.y = 0;
});

setInterval(() => {
    socket.emit("move", input);
}, 1000 / 60);

function getDist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateCamera(player) {
    const targetX = player.x + player.w / 2 - canvas.width / 2;
    const targetY = player.y + player.h / 2 - canvas.height / 2;

    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;

    camera.x = Math.max(0, Math.min(camera.x, zoneWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, zoneHeight - canvas.height));
}

function drawBackground() {
    const stripeSize = 200;
    const startX = Math.floor(camera.x / stripeSize) * stripeSize;
    const startY = Math.floor(camera.y / stripeSize) * stripeSize;

    for (let x = startX; x < camera.x + canvas.width; x += stripeSize) {
        for (let y = startY; y < camera.y + canvas.height; y += stripeSize) {
            ctx.fillStyle = ((x + y) / stripeSize) % 2 === 0 ? "#3F3" : "#2A2";
            ctx.fillRect(x - camera.x, y - camera.y, stripeSize, stripeSize);
        }
    }
}

function draw() {
    const me = players[myId];
    if (!me) {
        requestAnimationFrame(draw);
        return;
    }

    updateCamera(me);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);

    drawBackground();

    for (let id in players) {
        const p = players[id];
        if (getDist(me, p) > renderDistance) continue;

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(
            p.x - camera.x,
            p.y - camera.y,
            p.w,
            p.h
        );
    }

    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`HP: ${Math.round(me.hp)}`, 20, 30);

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
