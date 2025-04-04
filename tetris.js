// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    'cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'
];

// Add ghost piece opacity
const GHOST_PIECE_OPACITY = 0.3;

// Add lock delay constant (in milliseconds)
const LOCK_DELAY = 500;

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]],                    // I
    [[1, 1, 1], [0, 1, 0]],           // T
    [[1, 1, 1], [1, 0, 0]],           // L
    [[1, 1, 1], [0, 0, 1]],           // J
    [[1, 1], [1, 1]],                 // O
    [[1, 1, 0], [0, 1, 1]],           // S
    [[0, 1, 1], [1, 1, 0]]            // Z
];

// Add piece bag system
let pieceBag = [];

// Game variables
let canvas, ctx;
let holdCanvas, holdCtx;
let nextCanvas, nextCtx;
let nextNextCanvas, nextNextCtx;
let grid;
let score = 0;
let level = 1;
let gameOver = false;
let currentPiece, holdPiece;
let nextPiece, nextNextPiece;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000;
let canHold = true;

// Add lock delay variables
let lockDelayTimer = 0;
let isLocking = false;
let moveCounter = 0;
const MAX_LOCK_MOVES = 15;

// Add game state variables
let isGameStarted = false;
let isPaused = false;

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Generate new bag of pieces
function generateBag() {
    // Create array of indices 0-6
    const indices = Array.from({ length: SHAPES.length }, (_, i) => i);
    // Shuffle the indices
    return shuffleArray(indices);
}

// Get next piece from bag
function getNextPieceFromBag() {
    if (pieceBag.length === 0) {
        pieceBag = generateBag();
    }
    const typeId = pieceBag.pop();
    return {
        pos: {x: Math.floor(COLS/2) - Math.floor(SHAPES[typeId][0].length/2), y: 0},
        shape: SHAPES[typeId],
        color: COLORS[typeId]
    };
}

// Initialize game
function init() {
    // Setup main game board
    canvas = document.getElementById('gameBoard');
    ctx = canvas.getContext('2d');
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    // Setup preview canvases
    holdCanvas = document.getElementById('holdCanvas');
    holdCtx = holdCanvas.getContext('2d');
    holdCanvas.width = holdCanvas.height = 4 * BLOCK_SIZE;
    
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');
    nextCanvas.width = nextCanvas.height = 4 * BLOCK_SIZE;
    
    nextNextCanvas = document.getElementById('nextNextCanvas');
    nextNextCtx = nextNextCanvas.getContext('2d');
    nextNextCanvas.width = nextNextCanvas.height = 4 * BLOCK_SIZE;
    
    // Initialize grid
    grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    
    // Add start button event listener
    document.querySelector('.start-button').addEventListener('click', startGame);
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyPress);
    
    // Initial draw of empty board
    draw();
}

// Replace createPiece with getNextPieceFromBag
function createPiece() {
    return getNextPieceFromBag();
}

// Spawn new piece
function spawnPiece() {
    currentPiece = nextPiece;
    nextPiece = nextNextPiece;
    nextNextPiece = createPiece();
    if (checkCollision()) {
        gameOver = true;
    }
    updatePreviewDisplays();
}

// Update preview displays
function updatePreviewDisplays() {
    // Clear preview canvases
    clearPreviewCanvas(holdCtx);
    clearPreviewCanvas(nextCtx);
    clearPreviewCanvas(nextNextCtx);
    
    // Draw pieces
    if (holdPiece) drawPreviewPiece(holdCtx, holdPiece);
    drawPreviewPiece(nextCtx, nextPiece);
    drawPreviewPiece(nextNextCtx, nextNextPiece);
}

// Clear preview canvas
function clearPreviewCanvas(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 4 * BLOCK_SIZE, 4 * BLOCK_SIZE);
}

// Draw preview piece without grid
function drawPreviewPiece(ctx, piece) {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const offsetX = (4 - piece.shape[0].length) * BLOCK_SIZE / 2;
    const offsetY = (4 - piece.shape.length) * BLOCK_SIZE / 2;
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = piece.color;
                ctx.fillRect(
                    x * BLOCK_SIZE + offsetX,
                    y * BLOCK_SIZE + offsetY,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                // Draw block inner border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x * BLOCK_SIZE + offsetX + 2,
                    y * BLOCK_SIZE + offsetY + 2,
                    BLOCK_SIZE - 5,
                    BLOCK_SIZE - 5
                );
            }
        });
    });
}

// Modified game loop
function gameLoop(time = 0) {
    if (!isGameStarted || isPaused) {
        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        }
        return;
    }
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (isLocking) {
        lockDelayTimer += deltaTime;
    }
    
    if (dropCounter > dropInterval) {
        drop();
    }
    
    draw();
    
    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    } else {
        document.querySelector('.start-button').style.display = 'block';
        document.querySelector('.start-button').textContent = 'Play Again';
        isGameStarted = false;
    }
}

// Draw game state
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid only on main game board
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Draw grid
    grid.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = COLORS[value - 1];
                drawBlock(x, y);
            }
        });
    });
    
    // Draw ghost piece
    if (currentPiece) {
        const ghost = getGhostPosition();
        ghost.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = ghost.color;
                    ctx.globalAlpha = GHOST_PIECE_OPACITY;
                    drawBlock(ghost.pos.x + x, ghost.pos.y + y);
                    ctx.globalAlpha = 1;
                }
            });
        });
    }
    
    // Draw current piece
    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = currentPiece.color;
                    drawBlock(currentPiece.pos.x + x, currentPiece.pos.y + y);
                }
            });
        });
    }
}

// Draw grid lines
function drawGrid(context, width, height) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Increased opacity for better visibility
    context.lineWidth = 0.8; // Slightly thicker lines

    // Draw vertical lines
    for (let x = 0; x <= width; x += BLOCK_SIZE) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += BLOCK_SIZE) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

// Helper function to draw a block with grid lines
function drawBlock(x, y) {
    ctx.fillRect(
        x * BLOCK_SIZE,
        y * BLOCK_SIZE,
        BLOCK_SIZE - 1,
        BLOCK_SIZE - 1
    );
    
    // Draw block inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        x * BLOCK_SIZE + 2,
        y * BLOCK_SIZE + 2,
        BLOCK_SIZE - 5,
        BLOCK_SIZE - 5
    );
}

// Move piece
function movePiece(dir) {
    currentPiece.pos.x += dir;
    if (checkCollision()) {
        currentPiece.pos.x -= dir;
        return false;
    }
    if (isLocking) {
        moveCounter++;
    }
    return true;
}

// Drop piece
function drop() {
    currentPiece.pos.y++;
    if (checkCollision()) {
        currentPiece.pos.y--;
        
        // Start lock delay if not already started
        if (!isLocking) {
            isLocking = true;
            lockDelayTimer = 0;
            moveCounter = 0;
        }
        
        // Check if lock delay is exceeded or max moves reached
        if (lockDelayTimer >= LOCK_DELAY || moveCounter >= MAX_LOCK_MOVES) {
            mergePiece();
            clearLines();
            spawnPiece();
            canHold = true;
            isLocking = false;
            moveCounter = 0;
            
            // Update score and level
            score += 10;
            if (score > level * 1000) {
                level++;
                dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            }
            document.getElementById('score').textContent = score;
            document.getElementById('level').textContent = level;
        }
    } else {
        // Reset lock delay if piece moves down successfully
        isLocking = false;
        lockDelayTimer = 0;
        moveCounter = 0;
    }
    dropCounter = 0;
}

// Modified hard drop function
function hardDrop() {
    while (!checkCollision()) {
        currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    mergePiece();
    clearLines();
    spawnPiece();
    canHold = true;
    isLocking = false;
    moveCounter = 0;
    dropCounter = 0;
    
    // Update score and level
    score += 10;
    if (score > level * 1000) {
        level++;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
}

// Hold piece
function holdPieceFunction() {
    if (!canHold) return;
    
    if (!holdPiece) {
        holdPiece = {
            shape: currentPiece.shape,
            color: currentPiece.color
        };
        spawnPiece();
    } else {
        const temp = {
            shape: currentPiece.shape,
            color: currentPiece.color
        };
        currentPiece = {
            pos: {x: Math.floor(COLS/2) - Math.floor(holdPiece.shape[0].length/2), y: 0},
            shape: holdPiece.shape,
            color: holdPiece.color
        };
        holdPiece = temp;
    }
    
    canHold = false;
    updatePreviewDisplays();
}

// Rotate piece
function rotatePiece() {
    const originalShape = currentPiece.shape;
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    currentPiece.shape = rotated;
    
    if (checkCollision()) {
        currentPiece.shape = originalShape;
    } else if (isLocking) {
        moveCounter++;
    }
}

// Calculate ghost piece position
function getGhostPosition() {
    const ghost = {
        pos: { x: currentPiece.pos.x, y: currentPiece.pos.y },
        shape: currentPiece.shape,
        color: currentPiece.color
    };

    while (!checkCollision(ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;

    return ghost;
}

// Modified checkCollision function to accept a piece parameter
function checkCollision(piece = currentPiece) {
    return piece.shape.some((row, dy) =>
        row.some((value, dx) => {
            if (!value) return false;
            const newX = piece.pos.x + dx;
            const newY = piece.pos.y + dy;
            return newX < 0 || newX >= COLS || newY >= ROWS ||
                   (newY >= 0 && grid[newY][newX]);
        })
    );
}

// Add line clear effect
function createLineClearEffect(y) {
    const effect = document.createElement('div');
    effect.className = 'line-clear-effect';
    effect.style.top = `${y * BLOCK_SIZE}px`;
    effect.style.height = `${BLOCK_SIZE}px`;
    
    const container = document.querySelector('.game-board-container');
    container.appendChild(effect);
    
    // Remove effect after animation
    effect.addEventListener('animationend', () => {
        effect.remove();
    });
}

// Add sparkle effect function
function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.width = `${BLOCK_SIZE}px`;
    sparkle.style.height = `${BLOCK_SIZE}px`;
    sparkle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    
    const container = document.querySelector('.game-board-container');
    container.appendChild(sparkle);
    
    // Remove sparkle after animation
    sparkle.addEventListener('animationend', () => {
        sparkle.remove();
    });
}

// Modify mergePiece to add landing effect
function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const gridY = currentPiece.pos.y + y;
                if (gridY >= 0) {
                    grid[gridY][currentPiece.pos.x + x] = COLORS.indexOf(currentPiece.color) + 1;
                    // Add sparkle effect at the landing position
                    createSparkle(
                        (currentPiece.pos.x + x) * BLOCK_SIZE,
                        gridY * BLOCK_SIZE
                    );
                }
            }
        });
    });
}

// Modify clearLines to fix the line clear bug
function clearLines() {
    let linesCleared = 0;
    let linesToClear = [];
    
    // First, find all complete lines
    for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== 0)) {
            linesToClear.push(y);
            linesCleared++;
        }
    }
    
    // Add visual effect for each line with a slight delay
    linesToClear.forEach((y, index) => {
        setTimeout(() => {
            createLineClearEffect(y);
        }, index * 50); // 50ms delay between each line effect
    });
    
    // Remove lines and update grid immediately
    linesToClear.forEach(y => {
        grid.splice(y, 1);
        grid.unshift(Array(COLS).fill(0));
    });
    
    // Update score if lines were cleared
    if (linesCleared > 0) {
        score += linesCleared * linesCleared * 100;
        document.getElementById('score').textContent = score;
    }
}

// Handle keyboard input
function handleKeyPress(event) {
    if (event.keyCode === 81) { // Q key
        togglePause();
        return;
    }
    
    if (gameOver || !isGameStarted || isPaused) return;
    
    switch(event.keyCode) {
        case 37: // Left arrow
            movePiece(-1);
            break;
        case 39: // Right arrow
            movePiece(1);
            break;
        case 40: // Down arrow
            drop();
            break;
        case 38: // Up arrow
            rotatePiece();
            break;
        case 32: // Space
            hardDrop();
            break;
        case 16: // Shift
            holdPieceFunction();
            break;
    }
}

// Start game function
function startGame() {
    if (!isGameStarted) {
        // Reset game state
        gameOver = false;
        isGameStarted = true;
        isPaused = false;
        score = 0;
        level = 1;
        dropInterval = 1000;
        dropCounter = 0;
        lastTime = 0;
        lockDelayTimer = 0;
        isLocking = false;
        moveCounter = 0;
        canHold = true;
        
        // Reset grid
        grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        
        // Reset pieces
        holdPiece = null;
        pieceBag = generateBag();
        nextPiece = getNextPieceFromBag();
        nextNextPiece = getNextPieceFromBag();
        spawnPiece();
        
        // Update display
        document.getElementById('score').textContent = '0';
        document.getElementById('level').textContent = '1';
        document.querySelector('.start-button').style.display = 'none';
        document.querySelector('.pause-overlay').style.display = 'none';
        
        // Start game loop
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }
}

// Pause game function
function togglePause() {
    if (!isGameStarted || gameOver) return;
    
    isPaused = !isPaused;
    const pauseOverlay = document.querySelector('.pause-overlay');
    
    if (isPaused) {
        pauseOverlay.style.display = 'flex';
    } else {
        pauseOverlay.style.display = 'none';
        lastTime = 0; // Reset time to prevent sudden drops
        requestAnimationFrame(gameLoop);
    }
}

// Start the initialization
init(); 