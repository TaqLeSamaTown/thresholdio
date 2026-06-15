const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const socket = io();

const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {}; // Completely overwrite this on server update to clear disconnected users
let myId = null;
const zoneWidth = 3000;
const zoneHeight = 4500;
const renderDistance = 1600;
const camera = { x: 0, y: 0 };

const zMMsword = new Image();
zMMsword.src = "assets/weapons/zMMsword.png";
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let speed = 0.2;
let energy = 0;
let maxEnergy = 100;
let dtimer = 0;
let chatOpen = false;

canvas.addEventListener("click", e => {
    if (energy >= 16) {
        energy -= 16;
        dtimer = 20;
    }
});

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener("keydown", e => {
    if (e.key === "Escape" && chatOpen) closeChat();
    if (e.key === "Enter" && !chatOpen) {
        chatOpen = true;
        chat.style.display = "flex";
        chatInput.focus();
        e.preventDefault();
    }
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.stopPropagation();
        if (chatInput.value.trim() !== "") {
            socket.emit("chat", chatInput.value);
            chatInput.value = "";
        }
        closeChat();
    }
});

function closeChat() {
    chatOpen = false;
    chat.style.display = "none";
    chatInput.blur();
}

socket.on("connect", () => { myId = socket.id; });

// Replacing Object.assign fixes the ghost-player glitch when people disconnect
socket.on("state", serverPlayers => { 
    players = serverPlayers; 
});

socket.on("playerDisconnected", id => {
    delete players[id];
});

socket.on("chat", data => {
    const div = document.createElement("div");
    div.textContent = `${data.username}: ${data.message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function getDirection(player) {
    // Convert screen mouse coordinates into full server/world coordinates
    const mouseWorldX = mouse.x + camera.x;
    const mouseWorldY = mouse.y + camera.y;
    
    const dx = mouseWorldX - (player.x + player.w / 2);
    const dy = mouseWorldY - (player.y + player.h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
}

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
}

function drawBackground() {
    const stripeSize = 200;
    const startX = Math.floor(camera.x / stripeSize) * stripeSize;
    const startY = Math.floor(camera.y / stripeSize) * stripeSize;
    for (let x = startX; x < camera.x + canvas.width; x += stripeSize) {
        for (let y = startY; y < camera.y + canvas.height; y += stripeSize) {
            ctx.fillStyle = (Math.abs(x + y) / stripeSize) % 2 === 0 ? "#3C3" : "#2A2";
            ctx.fillRect(x - camera.x, y - camera.y, stripeSize, stripeSize);
        }
    }
}

setInterval(() => {
    if (chatOpen) return;
    const me = players[myId];
    if (!me) return;
    
    const dir = getDirection(me);
    socket.emit("move", { x: dir.x * speed, y: dir.y * speed });
    
    dtimer = Math.max(0, dtimer - 1);
    me.hp = Math.min(me.hp + 0.01, 100);
    energy = Math.min(energy + 0.1, maxEnergy);
    speed = dtimer > 0 ? 1.5 : 0.2;
}, 1000 / 60);

function draw() {
    const me = players[myId];
    if (!me) {
        requestAnimationFrame(draw);
        return;
    }
    
    updateCamera(me);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw the Background and Environment
    drawBackground();
    
    // 2. Draw all players and their weapons
    for (let id in players) {
        const p = players[id];
        if (getDist(me, p) > renderDistance) continue;
        
        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
        
        // Calculate the rotation facing the mouse pointer relative to player center
        const pCenterX = p.x - camera.x + p.w / 2;
        const pCenterY = p.y - camera.y + p.h / 2;
        const angle = Math.atan2(mouse.y - pCenterY, mouse.x - pCenterX);
        
        ctx.save();
        ctx.translate(pCenterX, pCenterY);
        ctx.rotate(angle);
        // Draws the sword extended out from the player model
        ctx.drawImage(zMMsword, 15, -16, 32, 32); 
        ctx.restore();
    }
    
    // 3. Draw Player UI Text over heads
    ctx.font = "16px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center"; 
    for (let id in players) {
        const p = players[id];
        if (getDist(me, p) > renderDistance) continue;
        if (!p.username) continue;
        
        const screenX = p.x - camera.x + p.w / 2;
        const screenY = p.y - camera.y - 10; // Placed neatly above their avatar
        ctx.fillText(p.username, screenX, screenY);
    }
    
    // 4. Fixed Screen HUD overlays
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${String(Math.round(me.hp))}`, 40, 30);
    ctx.fillText(`Energy: ${String(Math.round(energy))}`, 40, 60);
    
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

