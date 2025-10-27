// --- Lógica Específica do Modo Infinito (Deathmatch) ---

// Define/Acessa variáveis globais
window.p1 = null;
window.p2 = null;
window.roundOver = false;
window.roundWinner = null;
// p1StartPos, p2StartPos são gerados a cada rodada

// Garante que o modo está correto
isEndlessMode = true;

// --- Funções Específicas do DM ---

// Chamada pelo game.html DEPOIS que este script carregar
function setupEndlessGame() {
    console.log("Setup Endless Game");
    const ui = uiLayer; // Usa a variável global
    const canvasEl = canvas; // Usa a variável global

    if(ui) ui.classList.add('hidden'); // Garante UI escondida
    if(canvasEl) canvasEl.style.display = 'block';

    // Zera scores iniciais para o modo infinito
    p1Score = 0;
    p2Score = 0;

    // Inicia a primeira rodada
    initEndless();
}

function initEndless() {
    console.log("Iniciando Rodada Infinita");
    isEndlessMode = true;
    currentMap.walls = generateMazeWalls(); // Gera mapa DM (common.js)

    p1StartPos = findValidSpawnPoint();
    p2StartPos = findValidSpawnPoint([p1StartPos]);

    window.p1 = new Tank(p1StartPos.x, p1StartPos.y, '#03a9f4', { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', shoot: 'KeyE' });
    window.p2 = new Tank(p2StartPos.x, p2StartPos.y, '#f44336', { forward: 'ArrowUp', backward: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'KeyL' });

    // Ativa escudo inicial
    p1.isShielded = true; p1.shieldTimer = SPAWN_SHIELD_DURATION;
    p2.isShielded = true; p2.shieldTimer = SPAWN_SHIELD_DURATION;

    // Reseta estado da rodada
    projectiles = [];
    powerUpsOnMap = [];
    effects = [];
    window.nextPowerupTimer = 3000;
    updatePowerupUI();
    updateScores(); // Mostra scores (não zera aqui, pois acumula)

    // Inicia contagem regressiva
    countdownTimer = 3;
    countdownStart = performance.now();
    controlsLocked = true;
    window.roundOver = false;
    window.roundWinner = null;
    gameRunning = true;
    if(countdownDisplay) countdownDisplay.classList.add('visible');
    updateCountdownDisplay();

     if(uiLayer) uiLayer.classList.add('hidden'); // Garante UI escondida

    // Inicia loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    lastTime = 0;
    animationFrameId = requestAnimationFrame(gameLoopEndless);

    sounds.musica.play().catch(e=>console.log("Música bloqueada."));
}

// Lógica de colisão para DM (fim de round)
function checkCollisionsDM() {
     // Acessa p1/p2 globais
     const p1 = window.p1;
     const p2 = window.p2;
     if(!p1 || !p2) return;

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (!proj || proj.isImmune) continue;

        if (proj.type === 'laser') {
            [p1, p2].forEach(tank => {
                // isTankHitByLaser já checa isShielded e isForceShielded
                if (tank && !tank.isDestroyed && proj.owner !== tank && isTankHitByLaser(tank, proj.owner)) {
                    tank.isDestroyed = true;
                    effects.push(new Explosion(tank.x, tank.y, tank.color));
                    sounds.explosao.play().catch(()=>{});
                    // Fim de round no DM
                    proj.owner === p1 ? p1Score++ : p2Score++;
                    window.roundOver = true;
                    controlsLocked = true;
                    window.roundWinner = proj.owner === p1 ? 'Player 1 (Azul)' : 'Player 2 (Vermelho)';
                    updateScores();
                }
            });
            continue; // Laser não remove a si mesmo aqui
        }

        // <<< Função interna checkTankCollision CORRIGIDA >>>
        const checkTankCollision = (tank, proj) => {
             // Checa escudos primeiro (spawn e power-up)
            if (!tank || tank.isShielded || tank.isForceShielded || tank.isDestroyed) return false;
            // Checa auto-imunidade
            if (proj.owner === tank) {
                const timeSinceFired = Date.now() - proj.createdAt;
                if (timeSinceFired < SELF_IMMUNITY_DURATION) return false;
            }
            // Checa colisão física
            return Math.hypot(proj.x - tank.x, proj.y - tank.y) < (TANK_WIDTH/2 + proj.radius);
        };


        if (checkTankCollision(p1, proj)) {
            p1.isDestroyed = true;
            effects.push(new Explosion(p1.x, p1.y, p1.color));
            sounds.explosao.play().catch(()=>{});
            p2Score++;
            window.roundOver = true;
            controlsLocked = true;
            window.roundWinner = 'Player 2 (Vermelho)';
            updateScores();
            projectiles.splice(i, 1); return; // Remove projétil
        }
        else if (checkTankCollision(p2, proj)) {
            p2.isDestroyed = true;
            effects.push(new Explosion(p2.x, p2.y, p2.color));
            sounds.explosao.play().catch(()=>{});
            p1Score++;
            window.roundOver = true;
            controlsLocked = true;
            window.roundWinner = 'Player 1 (Azul)';
            updateScores();
            projectiles.splice(i, 1); return; // Remove projétil
        }
    }
}

// Exibe a tela de "vitória" da rodada no modo Infinito
function showVictoryScreenEndless(winner) {
    gameRunning = false;
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

     if(victoryTitle) victoryTitle.textContent = `${winner} VENCEU A RODADA!`;

     if(nextLevelButton) {
        nextLevelButton.textContent = 'Próxima Rodada';
        // Configura o botão AQUI
        nextLevelButton.onclick = () => {
             if(uiLayer) uiLayer.classList.add('hidden'); // Esconde UI ao reiniciar
             initEndless(); // Reinicia para próxima rodada
        };
     } else {
         console.error("Botão nextLevelButton não encontrado para configurar onClick em showVictoryScreenEndless.");
     }

    // Mostra a UI de vitória
    if(levelSelectionContainer) levelSelectionContainer.style.display = 'none';
    if(victoryMessage) victoryMessage.style.display = 'flex';
    if(uiLayer) uiLayer.classList.remove('hidden');
}


// --- Game Loop Específico do DM ---
function gameLoopEndless(timestamp) {
    if (!gameRunning && countdownTimer <= 0 && !window.roundOver) {
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
    }

    if (lastTime === 0) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (window.roundOver) {
        if (effects.length === 0) {
            window.roundOver = false;
            gameRunning = false;
             if(animationFrameId) cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
            showVictoryScreenEndless(window.roundWinner);
            return;
        }
    }

    if (controlsLocked && !window.roundOver) {
        const elapsed = performance.now() - countdownStart; const secondsPassed = Math.floor(elapsed / 1000);
        const newTimerValue = 3 - secondsPassed;
        if (newTimerValue !== countdownTimer) { countdownTimer = newTimerValue; updateCountdownDisplay(); }
        if (countdownTimer <= 0) { controlsLocked = false; if(countdownDisplay) countdownDisplay.classList.remove('visible'); window.nextPowerupTimer = NEW_POWERUP_INTERVAL; }
    }

     if(ctx && canvas) {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
        drawMap();

        const p1 = window.p1;
        const p2 = window.p2;
        if(p1) p1.update(deltaTime);
        if(p2) p2.update(deltaTime);

        for (let i = effects.length - 1; i >= 0; i--) { effects[i].update(); if (!effects[i].isAlive) effects.splice(i, 1); }
        projectiles.forEach(p => p.update());

        effects.forEach(e => e.draw());
        if(p1) p1.draw();
        if(p2) p2.draw();
        projectiles.forEach(p => p.draw());

        if (!controlsLocked) updatePowerUps(deltaTime);
        drawPowerUps();

        ctx.restore();
    } else { console.error("Canvas ou Context não encontrado no loop DM"); gameRunning = false; return; }

    drawNotification();

    if (!controlsLocked && !window.roundOver) {
        checkCollisionsDM();
    }

    if (gameRunning) {
       animationFrameId = requestAnimationFrame(gameLoopEndless);
    } else {
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}