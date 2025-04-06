// Get references to the HTML elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const gameOverMessage = document.getElementById('game-over-message');
const restartButton = document.getElementById('restart-button');

// --- Game State & Interval IDs ---
let isGameOver = false;
let creationIntervalId = null;
let movementIntervalId = null;

// --- Player Properties ---
const playerSpeed = 15;
let playerLeft; // Set in startGame

// --- Game Area & Element Dimensions ---
let gameAreaWidth;
let playerWidth;
let obstacleWidth = 30; // Match CSS
let obstacleHeight = 30; // Match CSS
let initialPlayerLeft; // Set in startGame

// --- Log Initial Element References ---
// console.log("Element References:", { gameArea, player, gameOverMessage, restartButton }); // Keep commented unless needed


// --- Player Movement Logic ---
function movePlayer(dx) {
    if (isGameOver || !gameAreaWidth || !playerWidth) return;
    let newLeft = playerLeft + dx;
    if (newLeft < 0) newLeft = 0;
    const maxLeft = gameAreaWidth - playerWidth;
    if (newLeft > maxLeft) newLeft = maxLeft;
    playerLeft = newLeft;
    player.style.left = playerLeft + 'px';
}

function handleKeyDown(event) {
    if (isGameOver) return;
    if (event.key === 'ArrowLeft') movePlayer(-playerSpeed);
    else if (event.key === 'ArrowRight') movePlayer(playerSpeed);
}
// Listener added in startGame


// --- Obstacle Logic ---
const obstacleSpeed = 3;
const obstacleCreationInterval = 1200;
let obstacles = []; // Array to track active obstacles

function createObstacle() {
    if (isGameOver || !gameAreaWidth || !obstacleWidth) return;

    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    const maxLeft = gameAreaWidth - obstacleWidth;
    const randomLeft = Math.floor(Math.random() * (maxLeft + 1));

    // Basic check - gameArea might not have width initially? Better check added in startGame
    if (maxLeft < 0) {
         console.error("Cannot create obstacle - maxLeft is negative.", {gameAreaWidth, obstacleWidth});
         return;
    }
    obstacle.style.left = randomLeft + 'px';
    obstacle.style.top = '0px';
    gameArea.appendChild(obstacle);
    obstacles.push(obstacle);
}

function moveObstacles() {
    // console.log("moveObstacles tick"); // <<< Remove or comment out this noisy log >>>
    if (isGameOver) return;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];

        // Check Collision FIRST
        if (checkCollision(player, obstacle)) {
            gameOver();
            return; // Stop loop immediately on collision
        }

        // Move obstacle
        let currentTop = obstacle.offsetTop;
        let newTop = currentTop + obstacleSpeed;
        obstacle.style.top = newTop + 'px';

        // Check off screen AFTER moving
        const areaHeight = gameArea.offsetHeight;
        if (areaHeight > 0 && newTop > areaHeight) {
             obstacle.remove();
             obstacles.splice(i, 1);
        } else if (areaHeight <= 0) {
             // console.warn("Game area height is 0 or negative.");
        }
    }
}

// --- Collision Detection Function ---
function checkCollision(element1, element2) {
    if (!element1 || !element2) return false;
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    if (rect1.width === 0 || rect1.height === 0 || rect2.width === 0 || rect2.height === 0) {
        return false;
    }
    const noOverlap =
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom;

    // if (!noOverlap) console.log("COLLISION DETECTED!"); // Keep commented
    return !noOverlap;
}

// --- Game Over Function ---
function gameOver() {
    if (isGameOver) return; // Prevent multiple triggers
    console.log("GAME OVER!");
    isGameOver = true;
    clearInterval(creationIntervalId);
    clearInterval(movementIntervalId);
    if (gameOverMessage) gameOverMessage.style.display = 'block';
    if (restartButton) restartButton.style.display = 'block';
}

// --- Restart Game Function (Simplified) ---
function restartGame() {
    console.log("Restarting game...");
    // startGame now handles clearing intervals, state, obstacles, and restarting loops
    startGame();
}

// --- Event Listener for Restart Button ---
if (restartButton) {
    restartButton.addEventListener('click', restartGame);
} else {
     if (!document.getElementById('restart-button')) {
       console.error("Restart button HTML element not found!");
    }
}

// --- Initial Game Start Function ---
function startGame() {
     console.log("Starting game...");

     // Calculate dimensions
     gameAreaWidth = gameArea.offsetWidth;
     playerWidth = player.offsetWidth;
     if(!playerWidth || playerWidth <= 0) {
         playerWidth = 40; // Default fallback
     }
     initialPlayerLeft = Math.floor((gameAreaWidth / 2) - (playerWidth / 2));
     // console.log(`Game Dimensions: AreaW=${gameAreaWidth}, PlayerW=${playerWidth}`); // Keep commented unless needed

     if (!gameAreaWidth || gameAreaWidth <= 0) {
         console.error("Could not get valid game area width on start!", gameAreaWidth);
         alert("Error: Could not initialize game dimensions.");
         return; // Stop if dimensions invalid
     }

     // Reset state
     isGameOver = false;
     playerLeft = initialPlayerLeft;
     player.style.left = playerLeft + 'px';
     player.style.bottom = '10px';

     // Clear obstacles from previous game (if any)
     while (obstacles.length > 0) {
        const obstacle = obstacles.pop();
        if (obstacle) obstacle.remove();
     }
     obstacles = []; // Ensure array is empty

     // Hide messages
     if (gameOverMessage) gameOverMessage.style.display = 'none';
     if (restartButton) restartButton.style.display = 'none';

     // Clear any previous intervals before starting new ones
     clearInterval(creationIntervalId);
     clearInterval(movementIntervalId);

     // --- RE-ENABLE OBSTACLE CREATION ---
     creationIntervalId = setInterval(createObstacle, obstacleCreationInterval);
     // ---
     movementIntervalId = setInterval(moveObstacles, 20);
     console.log("Game loops started."); // Simplified log


     // Add/Re-add key listener
     document.removeEventListener('keydown', handleKeyDown); // Ensure no duplicates
     document.addEventListener('keydown', handleKeyDown);

     // console.log("startGame function finished."); // Removed verbose log
}

// --- Ensure script runs after DOM is ready ---
window.addEventListener('DOMContentLoaded', (event) => {
    // console.log('DOM fully loaded and parsed'); // Keep commented unless needed
    if (!gameArea || !player) {
        console.error("Essential game elements not found on DOMContentLoaded!");
        return;
    }
    startGame(); // Start the game now
});

// Add a basic error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error("--- A GLOBAL JAVASCRIPT ERROR OCCURRED ---");
  console.error("Message:", message);
  console.error("Source:", source, `(Line: ${lineno}, Col: ${colno})`);
  console.error("Error Object:", error);
  console.error("------------------------------------------");
};

// console.log("Script loaded. Waiting for DOMContentLoaded to start game."); // Keep commented unless needed