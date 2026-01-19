const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const socket = io();

const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

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

function chatButtonPress() {
	if (!chatOpen) {
	chatOpen = true;
    chat.style.display = "flex";
    chatInput.focus();
	}
}
socket.on("connect", () => { myId = socket.id; });
socket.on("state", serverPlayers => { Object.assign(players, serverPlayers); });
socket.on("chat", data => {
    const div = document.createElement("div");
    div.textContent = `${data.username}: ${data.message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function getDirection(player) {
    const camX = player.x - canvas.width / 2 + player.w / 2;
    const camY = player.y - canvas.height / 2 + player.h / 2;
    const mouseWorldX = mouse.x + camX;
    const mouseWorldY = (canvas.height - mouse.y) + camY;
    const dx = mouseWorldX - (player.x + player.w / 2);
    const dy = mouseWorldY - (player.y + player.h / 2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist === 0) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
}

function getDist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function updateCamera(player) {
    const targetX = player.x + player.w/2 - canvas.width/2;
    const targetY = player.y + player.h/2 - canvas.height/2;
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
}

function drawBackground() {
    const stripeSize = 200;
    const startX = Math.floor(camera.x/stripeSize)*stripeSize;
    const startY = Math.floor(camera.y/stripeSize)*stripeSize;
    for(let x=startX;x<camera.x+canvas.width;x+=stripeSize){
        for(let y=startY;y<camera.y+canvas.height;y+=stripeSize){
            ctx.fillStyle = ((x+y)/stripeSize)%2===0?"#3C3":"#2A2";
            ctx.fillRect(x-camera.x,y-camera.y,stripeSize,stripeSize);
        }
    }
}
setInterval(() => {
    if (chatOpen) return;
    const me = players[myId];
    if (!me) return;
    const dir = getDirection(me);
    socket.emit("move", { x: dir.x * speed, y: dir.y * speed });
}, 1000 / 60);

function draw() {
    const me = players[myId];
    if (!me) {
        requestAnimationFrame(draw);
        return;
    }
    updateCamera(me);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(0,canvas.height);
    ctx.scale(1,-1);
    drawBackground();
    for(let id in players){
        const p = players[id];
        if(getDist(me,p)>renderDistance) continue;
        ctx.fillStyle = id===myId?"blue":"red";
        ctx.fillRect(p.x-camera.x,p.y-camera.y,p.w,p.h);
    }
	
	dtimer = Math.max(0,dtimer-1);
	me.hp = Math.min(me.hp+0.01,100);
	energy = Math.min(energy+0.1,maxEnergy);
	if (dtimer > 0) {
		speed = 1.5;
	}else{
		speed=0.2;
	}
    ctx.restore();
	ctx.font="16px Arial";
    ctx.fillStyle="white";
	ctx.fillText(`HP: ${String(Math.round(me.hp))}`,40,30);
	ctx.fillText(`Energy: ${String(Math.round(energy))}`,50,60);
    ctx.font="16px Arial";
    ctx.fillStyle="white";
    ctx.textAlign="center"; 
    for(let id in players){
        const p=players[id];
        if(getDist(me,p)>renderDistance) continue;
        if(!p.username) continue;
        const screenX = p.x-camera.x + p.w/2;
        const screenY = canvas.height-(p.y-camera.y)-p.h-6;
        ctx.fillText(p.username,screenX,screenY);
    }
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

