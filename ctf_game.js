// --- Lógica Específica do Modo Campanha (CTF) ---

// Define/Acessa variáveis globais
window.p1 = null;
window.p2 = null;
// flag1, flag2, p1StartPos, p2StartPos são inicializadas em common.js
window.roundOver = false;
window.roundWinner = null;

// Garante que o modo está correto
isEndlessMode = false;

// --- Funções Específicas do CTF ---

// Chamada pelo game.html DEPOIS que este script carregar
function setupCampaignUI() {
    console.log("Setup Campaign UI");
    const ui = uiLayer; // Usa a variável global agora definida
    const levelSel = levelSelectionContainer;
    const vicMsg = victoryMessage;

    // Garante que elementos existem antes de manipular
    if(ui) ui.classList.remove('hidden');
    if(levelSel) levelSel.style.display = 'flex'; // Usar flex para centralizar
    if(vicMsg) vicMsg.style.display = 'none';

    showLevelSelectionCampaign(); // Popula os botões

     if (nextLevelButton) { // Configura botão de vitória
        nextLevelButton.onclick = showLevelSelectionCampaign;
     } else {
        console.error("Botão nextLevelButton não encontrado no setupCampaignUI.");
     }
    // Adiciona listener ao botão Voltar, caso exista
    if (backButton) {
         backButton.onclick = () => window.location.href = 'menu.html';
    }
}


function startGameCampaign(levelIndex) { // Renomeado de initCampaign
    console.log("Iniciando Campanha Nível:", levelIndex);
    currentLevel = levelIndex;
    isEndlessMode = false;
    currentMap.walls = generateMazeWalls(); // Gera mapa CTB (common.js)

    // Cria os tanques nas posições definidas globalmente
    window.p1 = new Tank(p1StartPos.x, p1StartPos.y, '#03a9f4', { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', shoot: 'KeyE' });
    window.p2 = new Tank(p2StartPos.x, p2StartPos.y, '#f44336', { forward: 'ArrowUp', backward: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'KeyL' });

    // Ativa escudo inicial
    p1.isShielded = true; p1.shieldTimer = SPAWN_SHIELD_DURATION;
    p2.isShielded = true; p2.shieldTimer = SPAWN_SHIELD_DURATION;

    // Reseta estado do jogo
    projectiles = [];
    powerUpsOnMap = [];
    effects = [];
    window.nextPowerupTimer = 3000;
    updatePowerupUI();
    p1Score = 0; p2Score = 0;
    updateScores();

    // Reset flags
    if (window.flag1) window.flag1.returnToHome(); // Usa window.flag1
    if (window.flag2) window.flag2.returnToHome(); // Usa window.flag2
    if(p1) p1.hasEnemyFlag = false;
    if(p2) p2.hasEnemyFlag = false;

    // Inicia contagem regressiva
    countdownTimer = 3;
    countdownStart = performance.now();
    controlsLocked = true;
    window.roundOver = false;
    window.roundWinner = null;
    gameRunning = true;
    if(countdownDisplay) countdownDisplay.classList.add('visible');
    updateCountdownDisplay();

    if(uiLayer) uiLayer.classList.add('hidden'); // Esconde UI

    // Inicia loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Limpa loop anterior
    lastTime = 0;
    animationFrameId = requestAnimationFrame(gameLoopCampaign);

    sounds.musica.play().catch(e=>console.log("Música bloqueada."));
}

// Lógica de colisão para CTF (com respawn)
function checkCollisionsCTF() {
     // Acessa p1/p2 globais
     const p1 = window.p1;
     const p2 = window.p2;
     const flag1 = window.flag1; // Acessa global
     const flag2 = window.flag2; // Acessa global
     if(!p1 || !p2) return;

     for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (!proj || proj.isImmune) continue;

        if (proj.type === 'laser') {
            [p1, p2].forEach(tank => {
                // isTankHitByLaser já checa isShielded e isForceShielded (em common.js)
                if (tank && !tank.isDestroyed && proj.owner !== tank && isTankHitByLaser(tank, proj.owner)) {
                    tank.isDestroyed = true;
                    effects.push(new Explosion(tank.x, tank.y, tank.color));
                    sounds.explosao.play().catch(()=>{});
                    tank.respawnTimer = RESPAWN_TIME; // Inicia timer de respawn

                    if (tank.hasEnemyFlag) { // Derruba bandeira
                        const flagToDrop = (tank === p1) ? flag2 : flag1;
                        if(flagToDrop) flagToDrop.carrier = null; // Add check
                        tank.hasEnemyFlag = false;
                        notification.text = `${tank === p1 ? 'JOGADOR 1' : 'JOGADOR 2'} DEIXOU A BANDEIRA!`;
                        notification.color = tank.color; notification.timer = 120;
                    }
                }
            });
            continue; // Laser não remove a si mesmo aqui
        }

        // <<< CORREÇÃO APLICADA AQUI >>>
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
            p1.respawnTimer = RESPAWN_TIME;
            if (p1.hasEnemyFlag) {
                if(flag2) flag2.carrier = null; p1.hasEnemyFlag = false; // Add check
                notification.text = "JOGADOR 1 DEIXOU A BANDEIRA!"; notification.color = p1.color; notification.timer = 120;
            }
            projectiles.splice(i, 1); return; // Remove projétil
        }
        else if (checkTankCollision(p2, proj)) {
            p2.isDestroyed = true;
            effects.push(new Explosion(p2.x, p2.y, p2.color));
            sounds.explosao.play().catch(()=>{});
            p2.respawnTimer = RESPAWN_TIME;
            if (p2.hasEnemyFlag) {
                if(flag1) flag1.carrier = null; p2.hasEnemyFlag = false; // Add check
                notification.text = "JOGADOR 2 DEIXOU A BANDEIRA!"; notification.color = p2.color; notification.timer = 120;
            }
            projectiles.splice(i, 1); return; // Remove projétil
        }
    }
 }

// Lógica de pegar/devolver bandeira
function checkFlagCollisionsCTF() {
     const p1 = window.p1;
     const p2 = window.p2;
     const flag1 = window.flag1;
     const flag2 = window.flag2;
     if (isEndlessMode || !flag1 || !flag2 || !p1 || !p2) return;

     const collideDist = TANK_WIDTH / 2 + flag1.radius;

     if (p1 && !p1.isDestroyed) { // Adicionado P1 check
         if (!p1.hasEnemyFlag && !flag2.carrier && Math.hypot(p1.x - flag2.x, p1.y - flag2.y) < collideDist) {
             flag2.carrier = p1; p1.hasEnemyFlag = true;
             notification.text = "JOGADOR 1 PEGOU A BANDEIRA!"; notification.color = p1.color; notification.timer = 180;
         }
         if (!flag1.carrier && (flag1.x !== flag1.homeX || flag1.y !== flag1.homeY) && Math.hypot(p1.x - flag1.x, p1.y - flag1.y) < collideDist) {
             flag1.returnToHome();
             notification.text = "JOGADOR 1 DEVOLVEU A BANDEIRA!"; notification.color = p1.color; notification.timer = 180;
         }
     }

     if (p2 && !p2.isDestroyed) { // Adicionado P2 check
         if (!p2.hasEnemyFlag && !flag1.carrier && Math.hypot(p2.x - flag1.x, p2.y - flag1.y) < collideDist) {
             flag1.carrier = p2; p2.hasEnemyFlag = true;
             notification.text = "JOGADOR 2 PEGOU A BANDEIRA!"; notification.color = p2.color; notification.timer = 180;
         }
         if (!flag2.carrier && (flag2.x !== flag2.homeX || flag2.y !== flag2.homeY) && Math.hypot(p2.x - flag2.x, p2.y - flag2.y) < collideDist) {
             flag2.returnToHome();
             notification.text = "JOGADOR 2 DEVOLVEU A BANDEIRA!"; notification.color = p2.color; notification.timer = 180;
         }
     }
}

// Exibe a tela de vitória para Campanha
function showVictoryScreenCampaign(winner) {
    gameRunning = false;
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    let titleText = "";
    if (currentLevel + 1 === TOTAL_CAMPAIGN_LEVELS) {
        titleText = `${winner} VENCEU A CAMPANHA!`;
        if(nextLevelButton) nextLevelButton.textContent = 'Voltar ao Menu';
    } else {
        titleText = `${winner} venceu o Nível ${currentLevel + 1}!`;
         if(nextLevelButton) nextLevelButton.textContent = 'Continuar';
    }
     if(victoryTitle) victoryTitle.textContent = titleText;
     if(levelSelectionContainer) levelSelectionContainer.style.display = 'none';
     if(victoryMessage) victoryMessage.style.display = 'flex';
     if(uiLayer) uiLayer.classList.remove('hidden');
}

// Exibe a seleção de níveis
function showLevelSelectionCampaign() {
    isEndlessMode = false;
    sounds.musica.pause(); sounds.musica.currentTime = 0;
    p1Score = 0; p2Score = 0; updateScores();
    currentLevel = -1;

    if (!levelSelection) { console.error("Elemento #level-selection não encontrado."); return; }
    levelSelection.innerHTML = '';
    for (let i = 0; i < TOTAL_CAMPAIGN_LEVELS; i++) {
        const button = document.createElement('button'); button.textContent = i + 1; button.classList.add('level-button');
        if (i < unlockedLevel) {
             button.classList.add('unlocked');
             button.onclick = () => { startGameCampaign(i); }; // Chama startGameCampaign
        }
        levelSelection.appendChild(button);
    }
    // Garante visibilidade correta
    if(levelSelectionContainer) levelSelectionContainer.style.display = 'flex';
    if(victoryMessage) victoryMessage.style.display = 'none';
    if(uiLayer) uiLayer.classList.remove('hidden');
}

// --- Game Loop Específico do CTF ---
function gameLoopCampaign(timestamp) {
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
            if (unlockedLevel === currentLevel + 1 && unlockedLevel < TOTAL_CAMPAIGN_LEVELS) unlockedLevel++;
            showVictoryScreenCampaign(window.roundWinner);
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
        const flag1 = window.flag1;
        const flag2 = window.flag2;

        if(p1) p1.update(deltaTime);
        if(p2) p2.update(deltaTime);

        for (let i = effects.length - 1; i >= 0; i--) { effects[i].update(); if (!effects[i].isAlive) effects.splice(i, 1); }
        projectiles.forEach(p => p.update());
        if (flag1) flag1.update();
        if (flag2) flag2.update();

        if (flag1) flag1.draw();
        if (flag2) flag2.draw();
        effects.forEach(e => e.draw());
        if(p1) p1.draw();
        if(p2) p2.draw();
        projectiles.forEach(p => p.draw());

        if (!controlsLocked) updatePowerUps(deltaTime);
        drawPowerUps();

        ctx.restore();
    } else { console.error("Canvas ou Context não encontrado no loop CTF"); gameRunning = false; return; }

    drawNotification();

    if (!controlsLocked && !window.roundOver) {
        checkCollisionsCTF();
        checkFlagCollisionsCTF();

        const winDist = TANK_WIDTH / 2 + (flag1 ? flag1.radius : 0);
        const p1 = window.p1;
        const p2 = window.p2;
         if (p1 && flag1 && p1.hasEnemyFlag && Math.hypot(p1.x - flag1.homeX, p1.y - flag1.homeY) < winDist) {
            p1Score = 1; updateScores(); window.roundOver = true; controlsLocked = true; window.roundWinner = 'Player 1 (Azul)';
        } else if (p2 && flag2 && p2.hasEnemyFlag && Math.hypot(p2.x - flag2.homeX, p2.y - flag2.homeY) < winDist) {
            p2Score = 1; updateScores(); window.roundOver = true; controlsLocked = true; window.roundWinner = 'Player 2 (Vermelho)';
        }
    }

    if(gameRunning) {
       animationFrameId = requestAnimationFrame(gameLoopCampaign);
    } else {
       if(animationFrameId) cancelAnimationFrame(animationFrameId);
       animationFrameId = null;
    }
}