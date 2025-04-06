// Get references to the HTML elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const gameOverMessage = document.getElementById('game-over-message');
const restartButton = document.getElementById('restart-button');
const scoreDisplay = document.getElementById('score-display');
const topScoresListElement = document.getElementById('top-scores-list'); // Ref for Top 5 list
const recentScoresListElement = document.getElementById('recent-scores-list'); // Ref for Recent 5 list

// --- Game State, Score & Interval IDs ---
let isGameOver = false;
let creationIntervalId = null;
let movementIntervalId = null;
let scoreIntervalId = null;
let score = 0;

// --- Score Storage ---
const TOP_SCORES_KEY = 'dodgerTopScores'; // Key for localStorage
const RECENT_SCORES_KEY = 'dodgerRecentScores'; // Key for localStorage
let topScores = [];         // Array to hold top scores loaded from storage
let recentScores = [];      // Array to hold recent scores loaded from storage
const MAX_SCORES_STORED = 5; // Store top 5 / recent 5

// --- Player Properties ---
const playerSpeed = 8; // Base speed for smooth sliding
let playerLeft; // Current position, set in startGame

// --- Player Movement State ---
let isMovingLeft = false; // Tracks if left key is currently held
let isMovingRight = false; // Tracks if right key is currently held

// --- Game Area & Element Dimensions ---
let gameAreaWidth;
let playerWidth;
let obstacleWidth = 30; // Match CSS
let obstacleHeight = 30; // Match CSS
let initialPlayerLeft; // Set in startGame

// --- Obstacle Settings ---
const BASE_OBSTACLE_SPEED = 3; // Starting speed
let currentObstacleSpeed; // Current speed, increases over time
const obstacleCreationInterval = 1200; // Frequency remains constant for now
let obstacles = []; // Array to track active obstacles

// --- Difficulty Settings ---
const scoreThresholdForSpeedIncrease = 500; // Increase speed every 500 points
const speedIncrement = 0.5;                 // How much to increase speed by
const maxObstacleSpeed = 15;                // Optional: Set a maximum speed limit

// --- Score Settings ---
const scoreIncrementInterval = 100; // Milliseconds between score increases
const pointsPerIncrement = 10;      // Points added each interval


// --- localStorage Helper Functions ---
function getScoresFromStorage(key) {
    try {
        const scoresJSON = localStorage.getItem(key);
        if (scoresJSON) {
            const scores = JSON.parse(scoresJSON);
            // Basic validation that it's an array of numbers
            if (Array.isArray(scores) && scores.every(item => typeof item === 'number')) {
                return scores;
            } else {
                 console.warn(`Data in localStorage for key "${key}" is not a valid score array. Resetting.`);
                 return [];
            }
        }
    } catch (error) {
        console.error(`Error parsing scores from localStorage (key: ${key}):`, error);
    }
    return []; // Return empty array if not found or error
}

function saveScoresToStorage(key, scoresArray) {
    try {
        // Ensure it's always an array before saving
        if (!Array.isArray(scoresArray)) {
             console.error(`Attempted to save non-array to storage (key: ${key})`);
             return;
        }
        localStorage.setItem(key, JSON.stringify(scoresArray));
    } catch (error) {
        // Handle potential storage quota errors etc.
        console.error(`Error saving scores to localStorage (key: ${key}):`, error);
        alert("Could not save scores. Storage might be full.");
    }
}


// --- Display Update Functions ---
function displayScores(scoresArray, listElement, placeholder = '--') {
    if (!listElement) {
        console.error("Attempted to display scores to a non-existent element.");
        return; // Exit if element doesn't exist
    }
    listElement.innerHTML = ''; // Clear previous list items

    const scoresToDisplay = scoresArray.slice(0, MAX_SCORES_STORED);

    // Populate with actual scores
    scoresToDisplay.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s; // Display the score
        listElement.appendChild(li);
    });

    // Add placeholder list items if fewer than MAX_SCORES_STORED
    for (let i = scoresToDisplay.length; i < MAX_SCORES_STORED; i++) {
         const li = document.createElement('li');
         li.textContent = placeholder;
         listElement.appendChild(li);
     }
}


// --- Key Handlers for Smooth Movement ---
function handleSmoothKeyDown(event) {
    if (isGameOver) return;
    if (event.key === 'ArrowLeft') {
        isMovingLeft = true;
    } else if (event.key === 'ArrowRight') {
        isMovingRight = true;
    }
}

function handleSmoothKeyUp(event) {
    if (event.key === 'ArrowLeft') {
        isMovingLeft = false;
    } else if (event.key === 'ArrowRight') {
        isMovingRight = false;
    }
}
// Add Event Listeners (Globally)
document.addEventListener('keydown', handleSmoothKeyDown);
document.addEventListener('keyup', handleSmoothKeyUp);


// --- Obstacle Logic ---
function createObstacle() {
    if (isGameOver || !gameAreaWidth || !obstacleWidth) return;

    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    const maxLeft = gameAreaWidth - obstacleWidth;
    const randomLeft = Math.floor(Math.random() * (maxLeft + 1));

    if (maxLeft < 0) {
         console.error("Cannot create obstacle - maxLeft is negative.", {gameAreaWidth, obstacleWidth});
         return;
    }
    obstacle.style.left = randomLeft + 'px';
    obstacle.style.top = '0px';
    gameArea.appendChild(obstacle);
    obstacles.push(obstacle);
}

// --- Combined Movement Update Function (Player + Obstacles) ---
function moveObstacles() {
    if (isGameOver) return;

    // --- Player Smooth Sliding Update ---
    let dx = 0;
    if (isMovingLeft && !isMovingRight) dx = -playerSpeed;
    else if (isMovingRight && !isMovingLeft) dx = playerSpeed;

    if (dx !== 0 && playerWidth && gameAreaWidth) {
        let newLeft = playerLeft + dx;
        if (newLeft < 0) newLeft = 0;
        const maxLeft = gameAreaWidth - playerWidth;
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newLeft !== playerLeft) {
            playerLeft = newLeft;
            player.style.left = playerLeft + 'px';
        }
    }
    // --- End Player Smooth Sliding Update ---

    // --- Existing Obstacle Movement ---
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (checkCollision(player, obstacle)) {
            gameOver();
            return;
        }
        let currentTop = obstacle.offsetTop;
        let newTop = currentTop + currentObstacleSpeed;
        obstacle.style.top = newTop + 'px';
        const areaHeight = gameArea.offsetHeight;
        if (areaHeight > 0 && newTop > areaHeight) {
             obstacle.remove();
             obstacles.splice(i, 1);
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

    return !noOverlap;
}

// --- Score Update & Difficulty Increase ---
function updateScore() {
     if (isGameOver) return;
    score += pointsPerIncrement;
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score}`;
    } else {
        console.error("Score display element not found!");
        clearInterval(scoreIntervalId);
        return;
    }

    // Difficulty Increase Logic
    let speedIncreaseSteps = Math.floor(score / scoreThresholdForSpeedIncrease);
    let targetSpeed = BASE_OBSTACLE_SPEED + (speedIncreaseSteps * speedIncrement);
    targetSpeed = Math.min(targetSpeed, maxObstacleSpeed);
    if (targetSpeed > currentObstacleSpeed) {
        currentObstacleSpeed = targetSpeed;
    }
}

// --- Game Over Function (Handles Score Saving) ---
function gameOver() {
    if (isGameOver) return;
    console.log("GAME OVER! Final Score:", score);
    isGameOver = true;
    clearInterval(creationIntervalId);
    clearInterval(movementIntervalId);
    clearInterval(scoreIntervalId);

    // --- Update and Save Scores ---
    // Recent Scores
    recentScores.unshift(score); // Add new score to the beginning
    recentScores = recentScores.slice(0, MAX_SCORES_STORED); // Keep only the last MAX_SCORES_STORED
    saveScoresToStorage(RECENT_SCORES_KEY, recentScores);
    displayScores(recentScores, recentScoresListElement); // Update display immediately

    // Top Scores
    topScores.push(score); // Add new score
    topScores.sort((a, b) => b - a); // Sort descending (highest first)
    topScores = topScores.slice(0, MAX_SCORES_STORED); // Keep only top MAX_SCORES_STORED
    saveScoresToStorage(TOP_SCORES_KEY, topScores);
    displayScores(topScores, topScoresListElement); // Update display immediately
    // --- End Score Saving ---

    // Show game over UI
    if (gameOverMessage) gameOverMessage.style.display = 'block';
    if (restartButton) restartButton.style.display = 'block';
}

// --- Restart Game Function ---
function restartGame() {
    console.log("Restarting game...");
    startGame();
}

// --- Initial Game Start Function ---
function startGame() {
     console.log("Starting game...");

     // Calculate dimensions
     gameAreaWidth = gameArea.offsetWidth;
     playerWidth = player.offsetWidth;
     if(!playerWidth || playerWidth <= 0) playerWidth = 40;
     initialPlayerLeft = Math.floor((gameAreaWidth / 2) - (playerWidth / 2));

     if (!gameAreaWidth || gameAreaWidth <= 0) {
         console.error("Could not get valid game area width on start!", gameAreaWidth);
         alert("Error: Could not initialize game dimensions.");
         return;
     }

     // Reset state
     isGameOver = false;
     playerLeft = initialPlayerLeft;
     player.style.left = playerLeft + 'px';
     player.style.bottom = '10px';

     // Reset score for current game
     score = 0;
     if (scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;

     // Reset Obstacle Speed
     currentObstacleSpeed = BASE_OBSTACLE_SPEED;

     // Reset Movement Flags
     isMovingLeft = false;
     isMovingRight = false;

     // Clear obstacles
     while (obstacles.length > 0) {
        const obstacle = obstacles.pop();
        if (obstacle) obstacle.remove();
     }
     obstacles = [];

     // Hide messages
     if (gameOverMessage) gameOverMessage.style.display = 'none';
     if (restartButton) restartButton.style.display = 'none';

     // Clear ALL previous intervals
     clearInterval(creationIntervalId);
     clearInterval(movementIntervalId);
     clearInterval(scoreIntervalId);

     // Start new intervals
     creationIntervalId = setInterval(createObstacle, obstacleCreationInterval);
     movementIntervalId = setInterval(moveObstacles, 20);
     scoreIntervalId = setInterval(updateScore, scoreIncrementInterval);
     console.log("Game loops started.");

     // Event listeners are global
}

// --- Load Scores and Setup on DOM Ready ---
window.addEventListener('DOMContentLoaded', (event) => {
    // Check for essential elements
    const essentialElements = [gameArea, player, scoreDisplay, gameOverMessage, restartButton, topScoresListElement, recentScoresListElement];
    if (essentialElements.some(el => !el)) { // Check if any element is null
        console.error("Essential game elements (incl. score lists) not found on DOMContentLoaded! Check IDs in HTML.");
        alert("Error: One or more essential game elements are missing. Check HTML IDs.");
        return;
    }
    console.log("DOM loaded, essential elements found.");

    // Load scores from storage ONCE on page load
    topScores = getScoresFromStorage(TOP_SCORES_KEY);
    recentScores = getScoresFromStorage(RECENT_SCORES_KEY);
    console.log("Loaded Top Scores:", topScores);
    console.log("Loaded Recent Scores:", recentScores);

    // Display loaded scores immediately
    displayScores(topScores, topScoresListElement);
    displayScores(recentScores, recentScoresListElement);

    // Add listener for restart button here, after element is confirmed found
    if(restartButton) {
        restartButton.addEventListener('click', restartGame);
    } else {
        // This case should ideally be caught by the check above
        console.error("Restart button reference missing despite passing initial check?");
    }

    // Start the first game
    startGame();
});

// Add a basic error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error("--- A GLOBAL JAVASCRIPT ERROR OCCURRED ---");
    console.error("Message:", message);
    console.error("Source:", source, `(Line: ${lineno}, Col: ${colno})`);
    console.error("Error Object:", error);
    console.error("------------------------------------------");
};