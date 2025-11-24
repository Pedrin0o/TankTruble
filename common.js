// --- Elementos Comuns do DOM e Constantes ---
let canvas, ctx, uiLayer, countdownDisplay, levelSelectionContainer, levelSelection,
    victoryMessage, victoryTitle, nextLevelButton, p1ScoreElem, p2ScoreElem,
    p1PowerupElem, p2PowerupElem, backButton;

const TANK_WIDTH = 40, TANK_HEIGHT = 30, CANNON_WIDTH = 5, CANNON_LENGTH = 35;
const COLLISION_PADDING = 3; // Reduz a caixa de colisão
const TANK_SPEED = 2.8, ROTATION_SPEED = 0.05;
const BULLET_SPEED = 7, BULLET_RADIUS = 5;
const POWERUP_SIZE = 30;
const POWERUP_ICON_SIZE = 24;
const WORLD_WIDTH = 1280, WORLD_HEIGHT = 720;
let scale = 1, offsetX = 0, offsetY = 0;

const NEW_POWERUP_INTERVAL = 5000;
const MAX_POWERUPS_ON_MAP = 4;
const POWERUP_LIFETIME = 40000;
const PROJECTILE_IMMUNITY_DURATION = 100;
const SELF_IMMUNITY_DURATION = 300;
const PROJECTILE_LIFETIME = 7000;
const TOTAL_CAMPAIGN_LEVELS = 25;
const RESPAWN_TIME = 3000;
const SPAWN_SHIELD_DURATION = 2000;
const CTF_EXCLUSION_ZONE_WIDTH = 250;
const FORCE_SHIELD_DURATION = 10000;
const SWAP_SHOT_MAX_DIST = 500;

// --- Efeitos Sonoros ---
const sounds = {
    musica: new Audio('musica.mp3'),
    tiro: new Audio('tiro.mp3'),
    explosao: new Audio('explosao.mp3'),
    coletarPoder: new Audio('coletar_poder.mp3'),
    aparecerPoder: new Audio('aparecer_poder.mp3'),
    laser: new Audio('laser.mp3'),
    raioFantasma: new Audio('raio_fantasma.mp3')
};
sounds.musica.loop = true; sounds.musica.volume = 0.3; sounds.tiro.volume = 0.5;
sounds.laser.volume = 0.6; sounds.raioFantasma.volume = 0.7; sounds.coletarPoder.volume = 0.6; sounds.aparecerPoder.volume=0.4; sounds.explosao.volume=0.7;

// --- Variáveis de Estado Globais (Comuns) ---
let keysPressed = {};
let projectiles = [];
let powerUpsOnMap = [];
let effects = [];
let currentMap = { walls: [] };
let animationFrameId = null;
let notification = { text: '', color: '#FFF', timer: 0 };
let lastTime = 0;
let controlsLocked = false;
let countdownTimer = 0;
let countdownStart = 0;
let gameRunning = false;
let isEndlessMode = false;
let unlockedLevel = 1;
let currentLevel = 0;
// p1, p2, flag1, flag2 serão definidos nos scripts específicos

// --- Banco de Dados de Power-ups ---
const powerUpTypes = ['LÁSER', 'TIRO TELEGUIDADO', 'ESCOPETA', 'BOMBA CACHO', 'RAIO FANTASMA', 'TROCA', 'MARCAR', 'ESCUDO'];
const powerUpColors = { 'LÁSER': '#FF5733', 'TIRO TELEGUIDADO': '#FF00FF', 'ESCOPETA': '#FFA500', 'BOMBA CACHO': '#FFFFFF', 'RAIO FANTASMA': '#FDFD96', 'TROCA': '#00FFFF', 'MARCAR': '#FFFF00', 'ESCUDO': '#90EE90' };

const powerUpIcons = {
    'LÁSER': 'arma-de-raio.png',
    'TIRO TELEGUIDADO': 'missil.png',
    'ESCOPETA': 'bomba-de-espingarda.png',
    'BOMBA CACHO': 'bola-de-canhao.png',
    'RAIO FANTASMA': 'fantasma.png',
    'TROCA': 'teleporte.png',
    'MARCAR': 'marcar.png',
    'ESCUDO': 'defesa.png'
};
let loadedPowerupIcons = {};
let allIconsLoadedSuccessfully = false;

// --- Pré-carregamento das Imagens dos Ícones ---
function preloadPowerupIcons() {
    console.log("Iniciando pré-carregamento dos ícones...");
    let loadedCount = 0;
    const iconPaths = Object.values(powerUpIcons);
    const totalIconsToLoad = iconPaths.length;
    let successfulLoads = 0;

    if (totalIconsToLoad === 0) {
        console.log("Nenhum ícone definido para pré-carregar.");
        allIconsLoadedSuccessfully = true;
        return;
    }

    const checkAllLoaded = () => {
        if (loadedCount === totalIconsToLoad) {
            allIconsLoadedSuccessfully = (successfulLoads === totalIconsToLoad);
            console.log(`Pré-carregamento concluído. Sucesso: ${successfulLoads}/${totalIconsToLoad}`);
            if(!allIconsLoadedSuccessfully) {
                console.warn("Alguns ícones falharam ao carregar. Verifique os nomes e caminhos dos arquivos PNG.");
            }
        }
    };

    Object.keys(powerUpIcons).forEach(type => {
        const imagePath = powerUpIcons[type];
        if (imagePath) {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                successfulLoads++;
                console.log(`Ícone carregado: ${imagePath}`);
                loadedPowerupIcons[type] = img;
                checkAllLoaded();
            };
            img.onerror = () => {
                loadedCount++;
                console.error(`ERRO ao carregar ícone: ${imagePath}. Verifique nome/localização do arquivo.`);
                loadedPowerupIcons[type] = null; // Marca como falha
                checkAllLoaded();
            };
            console.log(`Tentando carregar: ${imagePath}`);
            img.src = imagePath; // Inicia o carregamento
        } else {
             console.warn(`Nenhum caminho de ícone definido para: ${type}`);
             loadedCount++; // Conta como 'tentado' mesmo que não haja caminho
             checkAllLoaded();
        }
    });
}


// --- Classes Comuns ---
class Flag { constructor(x, y, color) { this.homeX = x; this.homeY = y; this.x = x; this.y = y; this.color = color; this.carrier = null; this.radius = 15; this.poleHeight = 40;} update() { if (this.carrier) { if (this.carrier.isDestroyed) { this.carrier = null; } else { this.x = this.carrier.x; this.y = this.carrier.y; } } } draw() { if(!ctx) return; ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = this.carrier ? 'white' : '#444'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#888'; ctx.fillRect(-2, -this.poleHeight, 4, this.poleHeight); ctx.fillStyle = this.color; ctx.beginPath(); ctx.moveTo(2, -this.poleHeight); ctx.lineTo(this.radius * 1.5, -this.poleHeight + this.radius / 2); ctx.lineTo(2, -this.poleHeight + this.radius); ctx.closePath(); ctx.fill(); ctx.restore(); } returnToHome() { this.x = this.homeX; this.y = this.homeY; this.carrier = null; } }
class Tank {
    constructor(x, y, color, controls) { this.x = x; this.y = y; this.color = color; this.controls = controls; this.width = TANK_WIDTH; this.height = TANK_HEIGHT; this.angle = (x < WORLD_WIDTH / 2) ? 0 : Math.PI; this.isDestroyed = false; this.powerUp = null; this.homeX = x; this.homeY = y; this.respawnTimer = -1; this.hasEnemyFlag = false; this.isShielded = false; this.shieldTimer = 0; this.isForceShielded = false; this.forceShieldTimer = 0; this.hasSpawnMarker = false; this.tempSpawnPoint = null; }
    draw() { if(this.isDestroyed || !ctx) return; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = this.color; ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height); ctx.fillStyle = 'grey'; ctx.fillRect(0, -CANNON_WIDTH / 2, CANNON_LENGTH, CANNON_WIDTH); if (this.powerUp) { ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.powerUp[0], 0, 1); } if (this.isShielded) { ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 150) * 0.3; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.width / 2 + 10, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } if (this.isForceShielded) { ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.3; ctx.fillStyle = 'white'; ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, this.width / 2 + 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); } ctx.restore(); }
    update(deltaTime) {
        if (this.isDestroyed) {
             if (!isEndlessMode) {
                 if (this.respawnTimer > -1) {
                     if (this.respawnTimer > 0) {
                         this.respawnTimer -= deltaTime;
                     }
                     if (this.respawnTimer <= 0) {
                         console.log(`Respawning ${this.color} tank NOW. Timer: ${this.respawnTimer.toFixed(2)}`);
                         this.respawn();
                     }
                 }
             }
            return;
        }
        if (this.isShielded) { this.shieldTimer -= deltaTime; if (this.shieldTimer <= 0) { this.isShielded = false; this.shieldTimer = 0; } }
        if (this.isForceShielded) { this.forceShieldTimer -= deltaTime; if (this.forceShieldTimer <= 0) { this.isForceShielded = false; this.forceShieldTimer = 0; } }
        if (controlsLocked) return;
        if (keysPressed[this.controls.left]) this.rotate(-1);
        if (keysPressed[this.controls.right]) this.rotate(1);
        if (keysPressed[this.controls.forward]) this.move(1);
        if (keysPressed[this.controls.backward]) this.move(-1);
        if (keysPressed[this.controls.shoot] && !this.isForceShielded) { this.shoot(); }
    }
    move(direction) { const nextX = this.x + Math.cos(this.angle) * TANK_SPEED * direction; const nextY = this.y + Math.sin(this.angle) * TANK_SPEED * direction; if (!isPositionColliding(nextX, nextY, this.angle)) { this.x = nextX; this.y = nextY; } }
    rotate(direction) { const nextAngle = this.angle + ROTATION_SPEED * direction; if (!isPositionColliding(this.x, this.y, nextAngle)) { this.angle = nextAngle; } }
    respawn() { this.isDestroyed = false; if (this.tempSpawnPoint && !isEndlessMode) { console.log(`Respawning ${this.color} at temporary point`); this.x = this.tempSpawnPoint.x; this.y = this.tempSpawnPoint.y; this.tempSpawnPoint = null; } else { this.x = this.homeX; this.y = this.homeY; } this.angle = (this.homeX < WORLD_WIDTH / 2) ? 0 : Math.PI; this.powerUp = null; this.hasSpawnMarker = false; this.isForceShielded = false; this.forceShieldTimer = 0; this.respawnTimer = -1; this.isShielded = true; this.shieldTimer = SPAWN_SHIELD_DURATION; updatePowerupUI(); }
    shoot() { keysPressed[this.controls.shoot] = false; const spawnX = this.x; const spawnY = this.y; const target = this === window.p1 ? window.p2 : window.p1; if (this.hasSpawnMarker) { this.tempSpawnPoint = { x: spawnX, y: spawnY }; this.hasSpawnMarker = false; console.log(`${this.color} tank marked temp spawn at ${spawnX.toFixed(0)}, ${spawnY.toFixed(0)}`); notification.text = "SPAWN TEMPORÁRIO MARCADO!"; notification.color = this.color; notification.timer = 120; return; } let powerUpUsed = null; switch (this.powerUp) { case 'LÁSER': projectiles.push(new Laser(this)); powerUpUsed = 'LÁSER'; break; case 'TIRO TELEGUIDADO': projectiles.push(new HomingMissile(spawnX, spawnY, this.angle, this, this.color, target)); powerUpUsed = 'TIRO TELEGUIDADO'; break; case 'ESCOPETA': for (let i = -2; i <= 2; i++) { projectiles.push(new Bullet(spawnX, spawnY, this.angle + i * 0.15, this, this.color)); } sounds.tiro.play().catch(()=>{}); powerUpUsed = 'ESCOPETA'; break; case 'BOMBA CACHO': projectiles.push(new ClusterBomb(spawnX, spawnY, this.angle, this, this.color)); powerUpUsed = 'BOMBA CACHO'; break; case 'RAIO FANTASMA': projectiles.push(new PhantomRay(spawnX, spawnY, this.angle, this, powerUpColors['RAIO FANTASMA'], target)); powerUpUsed = 'RAIO FANTASMA'; break; case 'TROCA': projectiles.push(new SwapShot(spawnX, spawnY, this.angle, this, this.color, target)); sounds.tiro.play().catch(()=>{}); powerUpUsed = 'TROCA'; break; case 'MARCAR': this.hasSpawnMarker = true; notification.text = "APERTE ATIRAR PARA MARCAR SPAWN!"; notification.color = this.color; notification.timer = 180; powerUpUsed = 'MARCAR'; break; case 'ESCUDO': this.isForceShielded = true; this.forceShieldTimer = FORCE_SHIELD_DURATION; notification.text = "ESCUDO ATIVADO!"; notification.color = this.color; notification.timer = 120; powerUpUsed = 'ESCUDO'; break; default: if (!this.hasSpawnMarker) { this.fireStandardBullet(); } break; } if (powerUpUsed) { this.powerUp = null; updatePowerupUI(); } }
    fireStandardBullet() { sounds.tiro.play().catch(()=>{}); const spawnX = this.x; const spawnY = this.y; projectiles.push(new Bullet(spawnX, spawnY, this.angle, this, this.color)); }
}
class Projectile { constructor(x, y, angle, owner, color) { this.x = x; this.y = y; this.owner = owner; this.color = color; this.angle = angle; this.createdAt = Date.now(); this.radius = 1; this.type = 'base'; this.isImmune = true; } checkWallHit(px, py) { const x = px ?? this.x; const y = py ?? this.y; for (const wall of getcurrentwalls()) { if (x + this.radius > wall.x && x - this.radius < wall.x + wall.width && y + this.radius > wall.y && y - this.radius < wall.y + wall.height) return true; } return false; } destroy() { const index = projectiles.indexOf(this); if (index > -1) projectiles.splice(index, 1); } updateImmunity() { if (this.isImmune && Date.now() - this.createdAt > PROJECTILE_IMMUNITY_DURATION) { this.isImmune = false; } } update() { if (Date.now() - this.createdAt > PROJECTILE_LIFETIME) { this.destroy(); return; } this.updateImmunity(); } }
class Bullet extends Projectile { constructor(x, y, angle, owner, color) { super(x, y, angle, owner, color); this.radius = BULLET_RADIUS; this.vx = Math.cos(angle) * BULLET_SPEED; this.vy = Math.sin(angle) * BULLET_SPEED; this.type = 'bullet'; } draw() { if (this.isImmune || !ctx) return; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0; } update() { super.update(); if (projectiles.includes(this)) { this.x += this.vx; this.y += this.vy; this.handleRicochet(); } } handleRicochet() { if (this.x - this.radius < 0 || this.x + this.radius > WORLD_WIDTH) { this.vx *= -1; this.x += this.vx; } if (this.y - this.radius < 0 || this.y + this.radius > WORLD_HEIGHT) { this.vy *= -1; this.y += this.vy; } for (const wall of getcurrentwalls()) { if (this.x+this.radius>wall.x && this.x-this.radius<wall.x+wall.width && this.y+this.radius>wall.y && this.y-this.radius<wall.y+wall.height) { const pX=this.x-this.vx, pY=this.y-this.vy; if (pX+this.radius<=wall.x || pX-this.radius>=wall.x+wall.width) this.vx*=-1; if (pY+this.radius<=wall.y || pY-this.radius>=wall.y+wall.height) this.vy*=-1; this.x+=this.vx; this.y+=this.vy; break; } } } }
class HomingMissile extends Projectile { constructor(x, y, angle, owner, color, target) { super(x, y, angle, owner, color); this.target = target; this.radius = 8; this.speed = 3.0; this.turnSpeed = 0.06; this.type = 'homing'; this.length = 18; this.width = 8; this.avoidingWall = false; this.avoidTurnDirection = 0;} update() { super.update(); if (!projectiles.includes(this)) return; const p1 = window.p1; const p2 = window.p2; if (!this.target && p1 && p2) { this.target = this.owner === p1 ? p2 : p1; } if (!this.isImmune && (this.checkWallHit() || !this.target || this.target.isDestroyed )) { this.explodeAndDestroy(); return; } if (this.target && this.target.isDestroyed) { this.explodeAndDestroy(); return; } let wallCollisionAhead = false; let imminentCollision = false; const checkDistances = [20, 50, 90]; let bestAvoidAngle = 0; for (const dist of checkDistances) { const lookAheadX = this.x + Math.cos(this.angle) * dist; const lookAheadY = this.y + Math.sin(this.angle) * dist; if (this.checkWallHit(lookAheadX, lookAheadY)) { wallCollisionAhead = true; if (dist === checkDistances[0]) imminentCollision = true; bestAvoidAngle = this.angle + (Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1)); break; } } let targetAngle; if (wallCollisionAhead) { targetAngle = bestAvoidAngle; this.avoidingWall = true; this.avoidTurnDirection = Math.sign(targetAngle - this.angle); this.angle += this.avoidTurnDirection * this.turnSpeed * 2.5; } else { this.avoidingWall = false; if (this.target) { targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x); let angleDiff = targetAngle - this.angle; while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI; this.angle += Math.sign(angleDiff) * Math.min(this.turnSpeed, Math.abs(angleDiff)); } } while (this.angle > Math.PI) this.angle -= 2 * Math.PI; while (this.angle < -Math.PI) this.angle += 2 * Math.PI; this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; } draw() { if (this.isImmune || !ctx) return; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.fillRect(-this.length/2, -this.width/2, this.length, this.width); ctx.beginPath(); ctx.moveTo(this.length/2, 0); ctx.lineTo(this.length/2-6, -this.width/2); ctx.lineTo(this.length/2-6, this.width/2); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.restore(); } explodeAndDestroy() { effects.push(new SmallExplosion(this.x, this.y, this.color)); this.destroy(); } }
class ClusterBomb extends Projectile { constructor(x, y, angle, owner, color) { super(x, y, angle, owner, color); this.radius = 10; this.vx = Math.cos(angle) * 2; this.vy = Math.sin(angle) * 2; this.type = 'cluster'; this.fuse = 3000; this.isImmune = true; } update() { super.update(); if (!projectiles.includes(this)) return; this.x += this.vx; this.y += this.vy; if (!this.isImmune && (Date.now() - this.createdAt > this.fuse || this.checkWallHit())) { this.explode(); } } explode() { for (let i = 0; i < 8; i++) { projectiles.push(new Bullet(this.x, this.y, i * Math.PI / 4, this.owner, this.color)); } this.destroy(); } draw() { if (this.isImmune || !ctx) return; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#FFFFFF' : this.color; ctx.fill(); } }
class Laser extends Projectile { constructor(owner) { super(owner.x, owner.y, owner.angle, owner, powerUpColors['LÁSER']); this.type = 'laser'; this.life = 25; this.isImmune = false; sounds.laser.play().catch(()=>{}); } update() { this.life--; if (this.life <= 0) this.destroy(); } draw() { if (!ctx) return; const endX = this.owner.x + Math.cos(this.owner.angle) * 2000; const endY = this.owner.y + Math.sin(this.owner.angle) * 2000; ctx.save(); ctx.strokeStyle = this.color; ctx.lineWidth = 5; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.globalAlpha = Math.max(0, this.life / 15); ctx.beginPath(); ctx.moveTo(this.owner.x, this.owner.y); ctx.lineTo(endX, endY); ctx.stroke(); ctx.restore(); } }
class PhantomRay extends Projectile { constructor(x, y, angle, owner, color, target) { super(x, y, angle, owner, color); this.target = target; this.radius = 10; this.speed = 8; this.turnSpeed = 0.1; this.type = 'phantom_ray'; this.homingActivated = false; this.activationRadius = 250; this.isImmune = true; sounds.raioFantasma.play().catch(()=>{}); } update() { super.update(); if (!projectiles.includes(this)) return; const p1 = window.p1; const p2 = window.p2; if (!this.target && p1 && p2) { this.target = this.owner === p1 ? p2 : p1; } if(this.target && !this.target.isDestroyed) { const distance = Math.hypot(this.target.x - this.x, this.target.y - this.y); if (distance < this.activationRadius) { this.homingActivated = true; } if (this.homingActivated) { const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x); let d = targetAngle - this.angle; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.angle += Math.sign(d) * Math.min(this.turnSpeed, Math.abs(d)); } } this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; if (this.x < -this.radius || this.x > WORLD_WIDTH + this.radius || this.y < -this.radius || this.y > WORLD_HEIGHT + this.radius) this.destroy(); } draw() { if (this.isImmune || !ctx) return; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 15; ctx.fillRect(-12, -3, 24, 6); ctx.restore(); } }
class SwapShot extends Projectile { constructor(x, y, angle, owner, color, target) { super(x, y, angle, owner, color); this.speed = 8; this.radius = 6; this.type = 'swap'; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.target = target; this.distanceTraveled = 0; this.maxDistance = SWAP_SHOT_MAX_DIST; } update() { super.update(); if (!projectiles.includes(this)) return; const moveX = this.vx; const moveY = this.vy; this.x += moveX; this.y += moveY; this.distanceTraveled += Math.sqrt(moveX*moveX + moveY*moveY); if (this.distanceTraveled >= this.maxDistance || (!this.isImmune && this.checkWallHit())) { this.destroy(); return; } if (!this.isImmune && this.target && !this.target.isDestroyed && !this.target.isShielded && !this.target.isForceShielded) { const distToTarget = Math.hypot(this.x - this.target.x, this.y - this.target.y); if (distToTarget < (TANK_WIDTH / 2 + this.radius)) { this.performSwap(); this.destroy(); return; } } } performSwap() { if (!this.owner || !this.target || this.owner.isDestroyed || this.target.isDestroyed) return; console.log(`Swapping ${this.owner.color} and ${this.target.color}`); const ownerX = this.owner.x; const ownerY = this.owner.y; const targetX = this.target.x; const targetY = this.target.y; this.owner.x = targetX; this.owner.y = targetY; this.target.x = ownerX; this.target.y = ownerY; effects.push(new SwapEffect(ownerX, ownerY)); effects.push(new SwapEffect(targetX, targetY)); notification.text = "TROCA DE LUGAR!"; notification.color = "#FFFFFF"; notification.timer = 90; } draw() { if (this.isImmune || !ctx) return; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI / 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(0, -this.radius * 1.5); ctx.lineTo(this.radius, 0); ctx.lineTo(0, this.radius * 1.5); ctx.lineTo(-this.radius, 0); ctx.closePath(); ctx.fill(); ctx.restore(); } }

// --- Classes de Efeitos Visuais ---
class Particle { /*...*/ constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.angle = Math.random() * Math.PI * 2; this.speed = Math.random() * 5 + 2; this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed; this.life = 100 + Math.random() * 50; this.radius = Math.random() * 3 + 2; } update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.97; this.vy *= 0.97; this.life--; } draw() { if(!ctx) return; ctx.save(); ctx.globalAlpha = Math.max(0, this.life / 150); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.fill(); ctx.restore(); } }
class Explosion { /*...*/ constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.particles = []; this.isAlive = true; for (let i = 0; i < 40; i++) { this.particles.push(new Particle(x, y, color)); } for (let i = 0; i < 20; i++) { const fireColor = ['#FFA500', '#FF4500', '#FFD700', '#808080'][Math.floor(Math.random() * 4)]; this.particles.push(new Particle(x, y, fireColor)); } } update() { for (let i = this.particles.length - 1; i >= 0; i--) { this.particles[i].update(); if (this.particles[i].life <= 0) { this.particles.splice(i, 1); } } if (this.particles.length === 0) { this.isAlive = false; } } draw() { this.particles.forEach(p => p.draw()); } }
class SmallExplosion { /* ... (inalterado) ... */ constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.particles = []; this.isAlive = true; const particleCount = 15; for (let i = 0; i < particleCount; i++) { const p = new Particle(x, y, [color, '#FFA500', '#808080'][Math.floor(Math.random()*3)]); p.speed = Math.random() * 3 + 1; p.radius = Math.random() * 2 + 1; p.life = 50 + Math.random() * 30; this.particles.push(p); } } update() { /* ... (igual Explosion.update) ... */ for (let i = this.particles.length - 1; i >= 0; i--) { this.particles[i].update(); if (this.particles[i].life <= 0) { this.particles.splice(i, 1); } } if (this.particles.length === 0) { this.isAlive = false; } } draw() { /* ... (igual Explosion.draw) ... */ this.particles.forEach(p => p.draw()); } }
class SwapEffect { /* ... (inalterado) ... */ constructor(x, y) { this.x = x; this.y = y; this.radius = TANK_WIDTH; this.maxRadius = TANK_WIDTH * 1.5; this.life = 15; this.isAlive = true; } update() { this.radius += 2; this.life--; if (this.life <= 0) { this.isAlive = false; } } draw() { if (!ctx) return; ctx.save(); ctx.globalAlpha = Math.max(0, this.life / 15) * 0.7; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }

// --- IA GERADORA DE MAPAS ---

function generateMazeWalls() { /* ... (inalterado) ... */ if (isEndlessMode) { return generateDefaultMaze(); } else { p1StartPos = { x: 100, y: WORLD_HEIGHT / 2 }; p2StartPos = { x: WORLD_WIDTH - 100, y: WORLD_HEIGHT / 2 }; window.flag1 = new Flag(p1StartPos.x, p1StartPos.y, '#03a9f4'); window.flag2 = new Flag(p2StartPos.x, p2StartPos.y, '#f44336'); return generateCTFMazeWalls(p1StartPos, p2StartPos); } }
function generateCTFMazeWalls(baseP1, baseP2) { /* ... (inalterado) ... */
    const wallThickness = 12;
    const baseWallWidth = 20; const baseWallHeight = 140; const baseWallDepth = 100;
    const baseWalls = [ { type: 'base', x: baseP1.x + baseWallDepth - baseWallWidth, y: baseP1.y - baseWallHeight/2, width: baseWallWidth, height: baseWallHeight }, { type: 'base', x: baseP1.x, y: baseP1.y - baseWallHeight/2, width: baseWallDepth, height: baseWallWidth }, { type: 'base', x: baseP1.x, y: baseP1.y + baseWallHeight/2 - baseWallWidth, width: baseWallDepth, height: baseWallWidth }, { type: 'base', x: baseP2.x - baseWallDepth, y: baseP2.y - baseWallHeight/2, width: baseWallWidth, height: baseWallHeight }, { type: 'base', x: baseP2.x - baseWallDepth, y: baseP2.y - baseWallHeight/2, width: baseWallDepth, height: baseWallWidth }, { type: 'base', x: baseP2.x - baseWallDepth, y: baseP2.y + baseWallHeight/2 - baseWallWidth, width: baseWallDepth, height: baseWallWidth } ];
    const p1_no_build_zone = { x: 0, y: 0, width: CTF_EXCLUSION_ZONE_WIDTH, height: WORLD_HEIGHT };
    const p2_no_build_zone = { x: WORLD_WIDTH - CTF_EXCLUSION_ZONE_WIDTH, y: 0, width: CTF_EXCLUSION_ZONE_WIDTH, height: WORLD_HEIGHT };
    const generatedMazeWalls = generateDefaultMaze();
    const filteredMazeWalls = generatedMazeWalls.filter(wall => {
        if (wall.type === 'border') return true;
        const wallRect = { x: wall.x, y: wall.y, width: wall.width, height: wall.height };
        const overlapsZone1 = checkOverlap(wallRect, p1_no_build_zone);
        const overlapsZone2 = checkOverlap(wallRect, p2_no_build_zone);
        return !overlapsZone1 && !overlapsZone2;
    });
    const borderWalls = generatedMazeWalls.filter(w => w.type === 'border');
    const finalWalls = [...baseWalls, ...filteredMazeWalls, ...borderWalls];
    const uniqueWalls = Array.from(new Set(finalWalls.map(JSON.stringify))).map(JSON.parse);
    return uniqueWalls;
}
const checkOverlap = (rect1, rect2) => ( /* ... (inalterado) ... */ rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y );
function generateDefaultMaze() { /* ... (inalterado) ... */
    const cellSize = 90; const cols = Math.floor(WORLD_WIDTH / cellSize); const rows = Math.floor(WORLD_HEIGHT / cellSize);
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ visited: false, walls: { top: true, right: true, bottom: true, left: true } })));
    const stack = []; let startY = Math.floor(Math.random() * rows), startX = Math.floor(Math.random() * cols);
    if (!grid[startY]?.[startX]) { startY = 0; startX = 0;}
    let current = { cell: grid[startY][startX], x: startX, y: startY }; current.cell.visited = true; stack.push(current);
    const getNeighbors = (x, y) => { const neighbors = []; if (y > 0 && grid[y - 1]?.[x] && !grid[y - 1][x].visited) neighbors.push({ x: x, y: y-1, dir: 'top' }); if (x < cols - 1 && grid[y]?.[x + 1] && !grid[y][x + 1].visited) neighbors.push({ x: x+1, y: y, dir: 'right' }); if (y < rows - 1 && grid[y + 1]?.[x] && !grid[y + 1][x].visited) neighbors.push({ x: x, y: y+1, dir: 'bottom' }); if (x > 0 && grid[y]?.[x - 1] && !grid[y][x - 1].visited) neighbors.push({ x: x-1, y: y, dir: 'left' }); return neighbors; };
    while (stack.length > 0) {
        let currentPos = stack[stack.length - 1]; const neighbors = getNeighbors(currentPos.x, currentPos.y);
        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
             const nextCell = grid[next.y]?.[next.x]; if (!nextCell) { stack.pop(); continue; }
            if (next.dir === 'top') { currentPos.cell.walls.top = false; nextCell.walls.bottom = false; } else if (next.dir === 'right') { currentPos.cell.walls.right = false; nextCell.walls.left = false; } else if (next.dir === 'bottom') { currentPos.cell.walls.bottom = false; nextCell.walls.top = false; } else if (next.dir === 'left') { currentPos.cell.walls.left = false; nextCell.walls.right = false; }
            nextCell.visited = true; stack.push({cell: nextCell, x: next.x, y: next.y});
        } else { stack.pop(); }
    }
    const walls = []; const wallThickness = 12;
    for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { const cell = grid[y]?.[x]; if (!cell) continue; if (cell.walls.top && y > 0) walls.push({ type: 'maze', x: x * cellSize - wallThickness/2, y: y * cellSize - wallThickness/2, width: cellSize + wallThickness, height: wallThickness }); if (cell.walls.left && x > 0) walls.push({ type: 'maze', x: x * cellSize - wallThickness/2, y: y * cellSize - wallThickness/2, width: wallThickness, height: cellSize + wallThickness }); if (cell.walls.bottom && y === rows - 1) walls.push({ type: 'maze', x: x * cellSize - wallThickness/2, y: (y + 1) * cellSize - wallThickness/2, width: cellSize + wallThickness, height: wallThickness }); if (cell.walls.right && x === cols - 1) walls.push({ type: 'maze', x: (x + 1) * cellSize - wallThickness/2, y: y * cellSize - wallThickness/2, width: wallThickness, height: cellSize + wallThickness }); } }
    walls.push({ type: 'border', x: -wallThickness/2, y: -wallThickness/2, width: WORLD_WIDTH + wallThickness, height: wallThickness }); walls.push({ type: 'border', x: -wallThickness/2, y: WORLD_HEIGHT - wallThickness/2, width: WORLD_WIDTH + wallThickness, height: wallThickness }); walls.push({ type: 'border', x: -wallThickness/2, y: -wallThickness/2, width: wallThickness, height: WORLD_HEIGHT + wallThickness }); walls.push({ type: 'border', x: WORLD_WIDTH - wallThickness/2, y: -wallThickness/2, width: wallThickness, height: WORLD_HEIGHT + wallThickness });
    const internalMazeWalls = walls.filter(w => w.type === 'maze'); const wallsToRemoveCount = Math.floor(internalMazeWalls.length * 0.15);
    for (let i = 0; i < wallsToRemoveCount; i++) { if (internalMazeWalls.length > 0) { const randomIndex = Math.floor(Math.random() * internalMazeWalls.length); const wallToRemove = internalMazeWalls[randomIndex]; const wallIndexInMainArray = walls.indexOf(wallToRemove); if (wallIndexInMainArray > -1) { walls.splice(wallIndexInMainArray, 1); internalMazeWalls.splice(randomIndex, 1); } } }
    return walls;
}


// --- Funções Utilitárias Comuns ---
function getcurrentwalls() { return currentMap.walls; }
function isPointInsideWall(x, y) { /* ... (inalterado) ... */ for (const wall of getcurrentwalls()) { if (x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height) return true; } return false; }
// <<< isPositionColliding MODIFICADA (Usa padding) >>>
function isPositionColliding(x, y, angle) {
    const visualHalfWidth = TANK_WIDTH / 2;
    const visualHalfHeight = TANK_HEIGHT / 2;
    // Dimensões de COLISÃO (menores)
    const collisionHalfWidth = visualHalfWidth - COLLISION_PADDING;
    const collisionHalfHeight = visualHalfHeight - COLLISION_PADDING;

    // 1. Verifica limites do mapa (usa dimensões visuais)
    if (x - visualHalfWidth < 0 || x + visualHalfWidth > WORLD_WIDTH || y - visualHalfHeight < 0 || y + visualHalfHeight > WORLD_HEIGHT) return true;

    // 2. Calcula os cantos da CAIXA DE COLISÃO rotacionada
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const collisionCorners = [
        { x: x + (-collisionHalfWidth * cosA) - (-collisionHalfHeight * sinA), y: y + (-collisionHalfWidth * sinA) + (-collisionHalfHeight * cosA) },
        { x: x + ( collisionHalfWidth * cosA) - (-collisionHalfHeight * sinA), y: y + ( collisionHalfWidth * sinA) + (-collisionHalfHeight * cosA) },
        { x: x + ( collisionHalfWidth * cosA) - ( collisionHalfHeight * sinA), y: y + ( collisionHalfWidth * sinA) + ( collisionHalfHeight * cosA) },
        { x: x + (-collisionHalfWidth * cosA) - ( collisionHalfHeight * sinA), y: y + (-collisionHalfWidth * sinA) + ( collisionHalfHeight * cosA) }
    ];

    // 3. Pontos do canhão (inalterados)
    const cannonEndX = x + CANNON_LENGTH * cosA;
    const cannonEndY = y + CANNON_LENGTH * sinA;
    const cannonPoints = [ { x: x + (CANNON_LENGTH * 0.25) * cosA, y: y + (CANNON_LENGTH * 0.25) * sinA }, { x: x + (CANNON_LENGTH * 0.5) * cosA, y: y + (CANNON_LENGTH * 0.5) * sinA }, { x: x + (CANNON_LENGTH * 0.75) * cosA, y: y + (CANNON_LENGTH * 0.75) * sinA }, { x: cannonEndX, y: cannonEndY } ];

    // 4. Verifica colisão com paredes
    for (const wall of getcurrentwalls()) {
        const wallLeft = wall.x, wallRight = wall.x + wall.width;
        const wallTop = wall.y, wallBottom = wall.y + wall.height;

        // 4a. Checa AABB da caixa de COLISÃO
        const collisionTankLeft = x - collisionHalfWidth, collisionTankRight = x + collisionHalfWidth;
        const collisionTankTop = y - collisionHalfHeight, collisionTankBottom = y + collisionHalfHeight;
        if (collisionTankRight > wallLeft && collisionTankLeft < wallRight && collisionTankBottom > wallTop && collisionTankTop < wallBottom) {
             // 4b. Se AABB colide, checa os CANTOS DA COLISÃO
             for(const corner of collisionCorners) {
                 if (corner.x >= wallLeft && corner.x <= wallRight && corner.y >= wallTop && corner.y <= wallBottom) return true;
             }
             // Se AABB colide mas nenhum canto está dentro, ainda considera colisão
             return true;
        }

        // 4c. Checa colisão do CANHÃO
        for (const point of cannonPoints) {
            if (point.x >= wallLeft && point.x <= wallRight && point.y >= wallTop && point.y <= wallBottom) return true;
        }
    }
    return false; // Nenhuma colisão
}

function findValidSpawnPoint(avoidPoints = []) { /* ... (inalterado) ... */ let spawnPoint = null; let attempts = 0; const MIN_DISTANCE = 300; while (attempts < 1000) { const x = Math.random() * (WORLD_WIDTH - TANK_WIDTH * 4) + TANK_WIDTH * 2; const y = Math.random() * (WORLD_HEIGHT - TANK_HEIGHT * 4) + TANK_HEIGHT * 2; const angle = Math.random() * Math.PI * 2; if (!isPositionColliding(x, y, angle)) { let tooClose = false; for(const point of avoidPoints) { if (Math.hypot(x-point.x, y-point.y) < MIN_DISTANCE) { tooClose = true; break; } } if (!tooClose) { spawnPoint = { x, y }; break; } } attempts++; } if (!spawnPoint) {console.error("Não foi possível encontrar local seguro para spawn!"); return { x: 100, y: 100 };} return spawnPoint; }
function drawMap() { /* ... (inalterado) ... */ if(!ctx) return; ctx.fillStyle = '#2c2c2c'; ctx.fillRect(0,0,WORLD_WIDTH, WORLD_HEIGHT); ctx.fillStyle = '#6d6d6d'; getcurrentwalls().forEach(wall => { ctx.fillRect(wall.x, wall.y, wall.width, wall.height); }); }
// <<< isTankHitByLaser CORRIGIDO (checa isForceShielded) >>>
function isTankHitByLaser(tank, laserOwner) {
    if (!tank || tank.isShielded || tank.isForceShielded) return false;
    const laserAngle = laserOwner.angle;
    const dx = tank.x - laserOwner.x;
    const dy = tank.y - laserOwner.y;
    const distanceAlongLaser = dx * Math.cos(laserAngle) + dy * Math.sin(laserAngle);
    if (distanceAlongLaser < 0) return false;
    const perpendicularDist = Math.abs(dx * Math.sin(laserAngle) - dy * Math.cos(laserAngle));
    return perpendicularDist < TANK_WIDTH / 2;
}
function updateScores() { /* ... (inalterado) ... */ if(!p1ScoreElem || !p2ScoreElem) return; const p1Text = isEndlessMode ? `P1 Score: ${p1Score}` : `P1 Capturas: ${p1Score}`; const p2Text = isEndlessMode ? `P2 Score: ${p2Score}` : `P2 Capturas: ${p2Score}`; p1ScoreElem.textContent = p1Text; p2ScoreElem.textContent = p2Text; }
function updatePowerupUI() { /* ... (inalterado) ... */ if(!p1PowerupElem || !p2PowerupElem) return; const p1 = window.p1; const p2 = window.p2; p1PowerupElem.textContent = p1?.powerUp ? `P1: ${p1.powerUp}` : ''; p2PowerupElem.textContent = p2?.powerUp ? `P2: ${p2.powerUp}` : ''; }
function updatePowerUps(deltaTime) { /* ... (inalterado) ... */
    const p1 = window.p1; const p2 = window.p2; if(!p1 || !p2) return;
    let currentNextPowerupTimer = window.nextPowerupTimer ?? NEW_POWERUP_INTERVAL;
    currentNextPowerupTimer -= deltaTime;
    if (currentNextPowerupTimer <= 0 && powerUpsOnMap.length < MAX_POWERUPS_ON_MAP) {
        const type = powerUpTypes[Math.floor(Math.random()*powerUpTypes.length)];
        let x, y, attempts = 0, isValidPosition = false;
        while (!isValidPosition && attempts < 100) {
            const minX = isEndlessMode ? 30 : CTF_EXCLUSION_ZONE_WIDTH;
            const maxX = isEndlessMode ? WORLD_WIDTH - 30 : WORLD_WIDTH - CTF_EXCLUSION_ZONE_WIDTH;
            const minY = 30;
            const maxY = WORLD_HEIGHT - 30;
            x = Math.random() * (maxX - minX) + minX;
            y = Math.random() * (maxY - minY) + minY;
            if (!isPositionColliding(x, y, 0)) isValidPosition = true;
            attempts++;
        }
        if (isValidPosition) { powerUpsOnMap.push({ x, y, type, createdAt: Date.now() }); sounds.aparecerPoder.play().catch(()=>{}); }
        currentNextPowerupTimer = NEW_POWERUP_INTERVAL;
    }
    window.nextPowerupTimer = currentNextPowerupTimer;
    for (let i = powerUpsOnMap.length - 1; i >= 0; i--) { /* ... (lógica interna inalterada) ... */ const powerUp = powerUpsOnMap[i]; if (Date.now() - powerUp.createdAt > POWERUP_LIFETIME) { powerUpsOnMap.splice(i, 1); continue; } [p1, p2].forEach(tank => { if (tank && !tank.isDestroyed && !tank.powerUp && Math.hypot(powerUp.x - tank.x, powerUp.y - tank.y) < (TANK_WIDTH/2 + POWERUP_SIZE/2)) { tank.powerUp = powerUp.type; const playerName = tank === p1 ? "JOGADOR 1" : "JOGADOR 2"; notification.text = `${playerName} PEGOU ${tank.powerUp}!`; notification.color = tank.color; notification.timer = 180; powerUpsOnMap.splice(i, 1); updatePowerupUI(); sounds.coletarPoder.play().catch(()=>{}); } }); }
}
function drawPowerUps() { /* ... (inalterado) ... */
    if(!ctx) return;
    powerUpsOnMap.forEach(powerUp => {
        const { x, y, type, createdAt } = powerUp;
        const lifeLeft = (POWERUP_LIFETIME - (Date.now() - createdAt)) / POWERUP_LIFETIME;
        const icon = loadedPowerupIcons[type];
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = powerUpColors[type] || '#888';
        ctx.globalAlpha = 0.3 + Math.sin(Date.now()/150) * 0.4 + (lifeLeft * 0.3);
        ctx.fillRect(-POWERUP_SIZE/2, -POWERUP_SIZE/2, POWERUP_SIZE, POWERUP_SIZE);
        ctx.globalAlpha = 1;
        if (icon && icon instanceof Image && icon.complete && icon.naturalHeight !== 0) {
             try { ctx.drawImage( icon, -POWERUP_ICON_SIZE / 2, -POWERUP_ICON_SIZE / 2, POWERUP_ICON_SIZE, POWERUP_ICON_SIZE ); }
             catch (e) { console.error(`Erro ao desenhar imagem ${icon.src}:`, e); drawPowerupFallbackText(type); }
        } else { drawPowerupFallbackText(type); }
        ctx.restore();
    });
}
function drawPowerupFallbackText(type){ /* ... (inalterado) ... */ if (!ctx) return; ctx.fillStyle = (powerUpColors[type] === '#FFFFFF' || powerUpColors[type] === '#FFFF00' || powerUpColors[type] === '#FDFD96' || powerUpColors[type] === '#90EE90') ? '#000000' : '#FFFFFF'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(type ? type[0] : '?', 0, 3); }
function drawNotification() { /* ... (inalterado) ... */ if(!ctx || !canvas) return; if (notification.timer > 0) { ctx.save(); const fontSize = Math.min(window.innerWidth / 25, 40); ctx.font = `bold ${fontSize}px Courier New`; ctx.textAlign = 'center'; ctx.fillStyle = notification.color; ctx.strokeStyle = 'black'; ctx.lineWidth = 2; const alpha = Math.min(1, notification.timer / 60); ctx.globalAlpha = alpha; ctx.strokeText(notification.text, canvas.width / 2, canvas.height * 0.15); ctx.fillText(notification.text, canvas.width / 2, canvas.height * 0.15); notification.timer--; ctx.restore(); } }
function resizeGame() { /* ... (inalterado) ... */ if(!canvas) return; canvas.width = window.innerWidth; canvas.height = window.innerHeight; scale = Math.min(canvas.width / WORLD_WIDTH, canvas.height / WORLD_HEIGHT); offsetX = (canvas.width - WORLD_WIDTH * scale) / 2; offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2; }
function updateCountdownDisplay() { /* ... (inalterado) ... */ if(!countdownDisplay) return; countdownDisplay.textContent = countdownTimer > 0 ? countdownTimer : ''; }

// --- Event Listeners Globais ---
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('game-canvas');
        ctx = canvas ? canvas.getContext('2d') : null;
        uiLayer = document.getElementById('ui-layer');
        countdownDisplay = document.getElementById('countdown-display');
        levelSelectionContainer = document.getElementById('level-selection-container');
        levelSelection = document.getElementById('level-selection');
        victoryMessage = document.getElementById('victory-message');
        victoryTitle = document.getElementById('victory-title');
        nextLevelButton = document.getElementById('next-level-button');
        p1ScoreElem = document.getElementById('player1-score');
        p2ScoreElem = document.getElementById('player2-score');
        p1PowerupElem = document.getElementById('player1-powerup');
        p2PowerupElem = document.getElementById('player2-powerup');
        backButton = document.getElementById('back-to-menu-button');

        resizeGame();
        preloadPowerupIcons(); // Chama o pré-carregamento

        window.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyL'].includes(e.code)) { e.preventDefault(); } keysPressed[e.code] = true; });
        window.addEventListener('keyup', (e) => { keysPressed[e.code] = false; });
    });
    window.addEventListener('resize', resizeGame);
}