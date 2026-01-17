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

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let speed = 0.2;

let energy = 0;
let maxEnergy = 16000;

let dtimer = 0;

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        if (energy >= 16) {
            energy -= 16;
            dtimer = 20;
        }
    }
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


socket.on("connect", () => {
    myId = socket.id;
});

socket.on("state", serverPlayers => {
    for (let id in serverPlayers) {
        players[id] = serverPlayers[id];
    }
});

function getDirection(player) {
    const camX = player.x - canvas.width / 2 + player.w / 2;
    const camY = player.y - canvas.height / 2 + player.h / 2;

    const mouseWorldX = mouse.x + camX;
    const mouseWorldY = (canvas.height - mouse.y) + camY;

    const dx = mouseWorldX - (player.x + player.w / 2);
    const dy = mouseWorldY - (player.y + player.h / 2);

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: 0, y: 0 };

    return { x: dx / dist, y: dy / dist };
}

setInterval(() => {
	const me = players[myId];
    if (!me) return;

    const dir = getDirection(me);
    socket.emit("move", { x: dir.x * speed, y: dir.y * speed });
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
            ctx.fillStyle = ((x + y) / stripeSize) % 2 === 0 ? "#3C3" : "#2A2";
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
	
	dtimer = Math.max(0,dtimer-1);
	
	
    if (dtimer > 0) {
		speed = 1.5;
		dtimer -= 1;
	} else {
		speed = 0.2;
	}	
	
	energy = Math.min(maxEnergy, energy+16);
	
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

    ctx.font = "16px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    for (let id in players) {
        const p = players[id];
        if (getDist(me, p) > renderDistance) continue;
        if (!p.username) continue;

        const screenX = p.x - camera.x + p.w / 2;
        const screenY = canvas.height - (p.y - camera.y) - p.h - 6;

        ctx.fillText(p.username, screenX, screenY);
    }

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.round(me.hp)}`, 20, 30);
	ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Energy: ${Math.round(energy)}`, 20, 60);

    requestAnimationFrame(draw);
}


requestAnimationFrame(draw);
