// Get references to the HTML elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const gameOverMessage = document.getElementById('game-over-message');
const restartButton = document.getElementById('restart-button');
const scoreDisplay = document.getElementById('score-display');
const topScoresListElement = document.getElementById('top-scores-list');
const recentScoresListElement = document.getElementById('recent-scores-list');
const themeSelector = document.getElementById('theme-selector');
const resetScoresButton = document.getElementById('reset-scores-button');
const confirmResetDialog = document.getElementById('confirm-reset-dialog');
const confirmResetYesButton = document.getElementById('confirm-reset-yes');
const confirmResetNoButton = document.getElementById('confirm-reset-no');
const pauseMessage = document.getElementById('pause-message');

// --- Game State, Score & Interval IDs ---
let isGameOver = false; let isPaused = false; let creationIntervalId = null; let movementIntervalId = null; let score = 0;

// --- Score Storage ---
const TOP_SCORES_KEY = 'dodgerTopScores'; const RECENT_SCORES_KEY = 'dodgerRecentScores'; let topScores = []; let recentScores = []; const MAX_SCORES_STORED = 5;

// --- Theme Management ---
const THEME_STORAGE_KEY = 'dodgerTheme'; const availableThemes = ['space', 'deep-sea']; let currentTheme = 'space';

// --- Asset Definitions ---
const obstacleImages = { space: ['images/space_obstacle_asteroid.png', 'images/space_obstacle_meteor.png', 'images/space_obstacle_debris.png'], 'deep-sea': ['images/sea_obstacle_anchor.png', 'images/sea_obstacle_mine.png', 'images/sea_obstacle_rock.png'] };

// --- Player Properties ---
const playerSpeed = 8; let playerLeft;

// --- Player Movement State ---
let isMovingLeft = false; let isMovingRight = false;

// --- Game Area & Element Dimensions ---
let gameAreaWidth; let playerWidth; let obstacleWidth = 40; let obstacleHeight = 40; let initialPlayerLeft;

// --- Obstacle Settings ---
const BASE_OBSTACLE_SPEED = 3; let currentObstacleSpeed; const BASE_OBSTACLE_CREATION_INTERVAL = 1200; let currentObstacleCreationInterval; let obstacles = [];

// --- Difficulty Settings ---
const scoreThresholdForSpeedIncrease = 5; const speedIncrement = 0.5; const maxObstacleSpeed = 15; const scoreThresholdForFrequencyIncrease = 5; const frequencyDecrement = 150; const minObstacleCreationInterval = 300;

// --- Hitbox Scaling Factor ---
const HITBOX_SCALE = 0.55;


// --- localStorage Helper Functions ---
function getScoresFromStorage(key) { try { const d=localStorage.getItem(key); if(d){const s=JSON.parse(d); if(Array.isArray(s)&&s.every(i=>typeof i==='number')){return s;}else{console.warn(`Invalid data for key ${key}`);return[];}} }catch(e){console.error(`Err parse ${key}`,e);} return[];}
function saveScoresToStorage(key, arr) { try { if(!Array.isArray(arr)){return;} localStorage.setItem(key,JSON.stringify(arr));} catch(e){console.error(`Err save ${key}`,e);}}

// --- Display Update Functions ---
function displayScores(scoresArray, listElement, placeholder = '--') { if(!listElement)return; listElement.innerHTML=''; const displayArr=scoresArray.slice(0,MAX_SCORES_STORED); displayArr.forEach(s=>{const li=document.createElement('li');li.textContent=s;listElement.appendChild(li);}); for(let i=displayArr.length;i<MAX_SCORES_STORED;i++){const li=document.createElement('li');li.textContent=placeholder;listElement.appendChild(li);}}
function updateScoreDisplay() { if(scoreDisplay)scoreDisplay.textContent=`Score: ${score}`;}

// --- Theme Functions ---
function applyTheme(themeName) { if(!availableThemes.includes(themeName))themeName='space'; availableThemes.forEach(t=>document.body.classList.remove(`theme-${t}`)); document.body.classList.add(`theme-${themeName}`); currentTheme=themeName; localStorage.setItem(THEME_STORAGE_KEY,themeName); updateThemeButtonStyles();}
function loadTheme() { const saved=localStorage.getItem(THEME_STORAGE_KEY); applyTheme(saved||'space');}
function updateThemeButtonStyles() { if(!themeSelector)return; const btns=themeSelector.querySelectorAll('.theme-button'); btns.forEach(b=>{b.classList.toggle('active',b.dataset.theme===currentTheme);});}

// --- Key Handlers ---
function handleSmoothKeyDown(event) { if(isGameOver||isPaused)return; if(event.key==='ArrowLeft')isMovingLeft=true; else if(event.key==='ArrowRight')isMovingRight=true;}
function handleSmoothKeyUp(event) { if(event.key==='ArrowLeft')isMovingLeft=false; else if(event.key==='ArrowRight')isMovingRight=false;}
function handlePauseKey(event) { if(isGameOver)return; if(event.key==='Escape'||event.key==='p'||event.key==='P'){if(isPaused){resumeGame();}else{pauseGame();}}}

// --- Obstacle Logic ---
function createObstacle() { if(isGameOver||isPaused||!gameAreaWidth||!obstacleWidth)return; const themeImgs=obstacleImages[currentTheme]; if(!themeImgs||!themeImgs.length)return; const idx=Math.floor(Math.random()*themeImgs.length); const src=themeImgs[idx]; const obs=document.createElement('div'); obs.classList.add('obstacle'); obs.style.backgroundImage=`url('${src}')`; const maxL=gameAreaWidth-obstacleWidth; const randL=Math.floor(Math.random()*(maxL+1)); if(maxL<0)return; obs.style.left=`${randL}px`; obs.style.top='0px'; gameArea.appendChild(obs); obstacles.push(obs);}

// --- Combined Movement Update Function ---
function moveObstacles() { if(isGameOver||isPaused)return; let dx=0; if(isMovingLeft&&!isMovingRight)dx=-playerSpeed; else if(isMovingRight&&!isMovingLeft)dx=playerSpeed; if(dx!==0&&playerWidth&&gameAreaWidth){let nL=playerLeft+dx; if(nL<0)nL=0; const maxL=gameAreaWidth-playerWidth; if(nL>maxL)nL=maxL; if(nL!==playerLeft){playerLeft=nL;player.style.left=`${playerLeft}px`;}} for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i]; if(checkCollision(player,o)){gameOver();return;} let ct=o.offsetTop; let nt=ct+currentObstacleSpeed; o.style.top=`${nt}px`; const ah=gameArea.offsetHeight; if(ah>0&&nt>ah){score++;updateScoreDisplay(); let ss=Math.floor(score/scoreThresholdForSpeedIncrease); let ts=BASE_OBSTACLE_SPEED+(ss*speedIncrement); ts=Math.min(ts,maxObstacleSpeed); if(ts>currentObstacleSpeed){currentObstacleSpeed=ts;console.log(`Score:${score}, Speed->${currentObstacleSpeed}`);} let fs=Math.floor(score/scoreThresholdForFrequencyIncrease); let ti=BASE_OBSTACLE_CREATION_INTERVAL-(fs*frequencyDecrement); ti=Math.max(ti,minObstacleCreationInterval); if(ti<currentObstacleCreationInterval){currentObstacleCreationInterval=ti;console.log(`Score:${score}, Interval->${currentObstacleCreationInterval}ms`); clearInterval(creationIntervalId); creationIntervalId=setInterval(createObstacle,currentObstacleCreationInterval);} o.remove();obstacles.splice(i,1);}}}

// --- Collision Detection Function ---
function checkCollision(e1,e2){if(!e1||!e2)return false; const r1=e1.getBoundingClientRect(); const r2=e2.getBoundingClientRect(); if(r1.width===0||r1.height===0||r2.width===0||r2.height===0)return false; const w1=r1.width*HITBOX_SCALE; const h1=r1.height*HITBOX_SCALE; const iX1=(r1.width-w1)/2; const iY1=(r1.height-h1)/2; const w2=r2.width*HITBOX_SCALE; const h2=r2.height*HITBOX_SCALE; const iX2=(r2.width-w2)/2; const iY2=(r2.height-h2)/2; const ir1={l:r1.left+iX1,r:r1.right-iX1,t:r1.top+iY1,b:r1.bottom-iY1}; const ir2={l:r2.left+iX2,r:r2.right-iX2,t:r2.top+iY2,b:r2.bottom-iY2}; const nO=ir1.r<ir2.l||ir1.l>ir2.r||ir1.b<ir2.t||ir1.t>ir2.b; return !nO;}

// --- Pause/Resume Functions ---
function pauseGame(){if(isPaused||isGameOver)return; isPaused=true; clearInterval(creationIntervalId); clearInterval(movementIntervalId); if(pauseMessage)pauseMessage.style.display='block'; console.log("Paused");}
function resumeGame(){if(!isPaused||isGameOver)return; isPaused=false; if(pauseMessage)pauseMessage.style.display='none'; clearInterval(creationIntervalId); clearInterval(movementIntervalId); creationIntervalId=setInterval(createObstacle,currentObstacleCreationInterval); movementIntervalId=setInterval(moveObstacles,20); console.log("Resumed");}

// --- Game Over Function ---
function gameOver(){if(isGameOver)return; console.log(`GAME OVER! Score:${score}`); isGameOver=true; isPaused=false; clearInterval(creationIntervalId); clearInterval(movementIntervalId); if(pauseMessage)pauseMessage.style.display='none'; recentScores.unshift(score); recentScores=recentScores.slice(0,MAX_SCORES_STORED); saveScoresToStorage(RECENT_SCORES_KEY,recentScores); displayScores(recentScores,recentScoresListElement); topScores.push(score); topScores.sort((a,b)=>b-a); topScores=topScores.slice(0,MAX_SCORES_STORED); saveScoresToStorage(TOP_SCORES_KEY,topScores); displayScores(topScores,topScoresListElement); if(gameOverMessage)gameOverMessage.style.display='block'; if(restartButton)restartButton.style.display='block';}

// --- Restart Game Function ---
function restartGame(){console.log("Restarting..."); startGame();}

// --- Initial Game Start Function ---
function startGame(){
     console.log("Starting game...");
     // Calculate dimensions
     gameAreaWidth = gameArea.offsetWidth; playerWidth = player.offsetWidth;
     // Log the dimensions that were read
     console.log(`Initial Read Dimensions -> Game Area W: ${gameAreaWidth}, Player W: ${playerWidth}`);
     if(!playerWidth || playerWidth <= 0) {
         console.warn(`Player width read as ${playerWidth}. Using default 50px.`);
         playerWidth = 50; // Use correct default
     }
     if (!gameAreaWidth || gameAreaWidth <= 0){
         console.error("Could not get valid game area width on start!", gameAreaWidth);
         alert("Error init dimensions."); return;
     }
     initialPlayerLeft = Math.floor((gameAreaWidth / 2)-(playerWidth / 2));
     // Reset state
     isGameOver = false; isPaused = false; playerLeft = initialPlayerLeft; player.style.left=playerLeft+'px'; player.style.bottom='10px'; score = 0; updateScoreDisplay(); currentObstacleSpeed = BASE_OBSTACLE_SPEED; currentObstacleCreationInterval = BASE_OBSTACLE_CREATION_INTERVAL; isMovingLeft = false; isMovingRight = false;
     // Clear obstacles
     while (obstacles.length > 0){const o = obstacles.pop(); if(o) o.remove();} obstacles = [];
     // Hide messages
     if (gameOverMessage) gameOverMessage.style.display = 'none'; if (restartButton) restartButton.style.display = 'none'; if (pauseMessage) pauseMessage.style.display = 'none';
     // Clear intervals
     clearInterval(creationIntervalId); clearInterval(movementIntervalId);
     // Start intervals
     creationIntervalId = setInterval(createObstacle, currentObstacleCreationInterval);
     movementIntervalId = setInterval(moveObstacles, 20);
     console.log("Game loops started.");
}

// --- Load Scores, Theme and Setup on DOM Ready ---
window.addEventListener('DOMContentLoaded',(e)=>{
    const E=[gameArea,player,scoreDisplay,gameOverMessage,restartButton,topScoresListElement,recentScoresListElement,themeSelector,resetScoresButton,confirmResetDialog,confirmResetYesButton,confirmResetNoButton,pauseMessage];
    if(E.some(el=>!el)){console.error("Essential elements missing! Check IDs.");alert("Error loading elements.");return;} console.log("DOM loaded.");
    loadTheme();
    const tBtns=themeSelector.querySelectorAll('.theme-button'); tBtns.forEach(b=>b.addEventListener('click',(ev)=>applyTheme(ev.target.dataset.theme)));
    topScores=getScoresFromStorage(TOP_SCORES_KEY); recentScores=getScoresFromStorage(RECENT_SCORES_KEY); displayScores(topScores,topScoresListElement); displayScores(recentScores,recentScoresListElement);
    if(restartButton)restartButton.addEventListener('click',restartGame);
    if(resetScoresButton)resetScoresButton.addEventListener('click',()=>{if(confirmResetDialog)confirmResetDialog.style.display='block';});
    if(confirmResetNoButton)confirmResetNoButton.addEventListener('click',()=>{if(confirmResetDialog)confirmResetDialog.style.display='none';});
    if(confirmResetYesButton)confirmResetYesButton.addEventListener('click',()=>{console.log("Resetting...");localStorage.removeItem(TOP_SCORES_KEY);localStorage.removeItem(RECENT_SCORES_KEY);topScores=[];recentScores=[];displayScores(topScores,topScoresListElement);displayScores(recentScores,recentScoresListElement);if(confirmResetDialog)confirmResetDialog.style.display='none';console.log("Scores reset.");});
    startGame(); // Start first game
});

// --- Add Global Event Listeners ---
document.addEventListener('keydown', handleSmoothKeyDown);
document.addEventListener('keyup', handleSmoothKeyUp);
document.addEventListener('keydown', handlePauseKey);

// --- Error Handling ---
window.onerror = function(m,s,l,c,e){console.error(`Unhandled Error: ${m} at ${s}:${l}:${c}`,e);};