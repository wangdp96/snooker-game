// Snooker Game - Main Game Logic

const canvas = document.getElementById('snookerCanvas');
const ctx = canvas.getContext('2d');

// Table dimensions (playing area)
const TABLE = {
    x: 40,
    y: 40,
    width: 920,
    height: 440,
    cushionWidth: 8,
    pocketRadius: 18
};

// Ball properties
const BALL_RADIUS = 10;
const FRICTION = 0.985;
const MIN_SPEED = 0.1;
const MAX_POWER = 15;

// Pocket positions (6 pockets)
const POCKETS = [
    { x: TABLE.x + 5, y: TABLE.y + 5 },                    // Top-left
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y - 2 },      // Top-center
    { x: TABLE.x + TABLE.width - 5, y: TABLE.y + 5 },      // Top-right
    { x: TABLE.x + 5, y: TABLE.y + TABLE.height - 5 },     // Bottom-left
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height + 2 }, // Bottom-center
    { x: TABLE.x + TABLE.width - 5, y: TABLE.y + TABLE.height - 5 }  // Bottom-right
];

// Ball colors
const COLORS = {
    cue: '#FFFFFF',
    red: '#E53935',
    yellow: '#FFEB3B',
    green: '#4CAF50',
    brown: '#795548',
    blue: '#2196F3',
    pink: '#E91E63',
    black: '#212121'
};

// Ball points
const POINTS = {
    red: 1,
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7
};

// Color respawn positions
const SPOT_POSITIONS = {
    yellow: { x: TABLE.x + TABLE.width * 0.25, y: TABLE.y + TABLE.height / 2 },
    green: { x: TABLE.x + TABLE.width * 0.75, y: TABLE.y + TABLE.height / 2 },
    brown: { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 },
    blue: { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 },
    pink: { x: TABLE.x + TABLE.width * 0.73, y: TABLE.y + TABLE.height / 2 },
    black: { x: TABLE.x + TABLE.width - 50, y: TABLE.y + TABLE.height / 2 }
};

// Game state
let balls = [];
let currentPlayer = 1;
let scores = [0, 0];
let gameState = 'aiming'; // aiming, moving, placing, gameover
let mousePos = { x: 0, y: 0 };
let power = 50;
let message = '';
let foul = false;
let redsRemaining = 15;
let colorsOnTable = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
let currentBallOn = 'red'; // What ball should be hit first
let potSequence = []; // Track pots in current shot
let breakScore = 0;
let placingCue = false;
let firstHit = null; // First ball hit by cue ball

class Ball {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.type = type; // 'cue', 'red', 'color'
        this.potted = false;
        this.radius = BALL_RADIUS;
    }

    update() {
        if (this.potted) return;

        this.x += this.vx;
        this.y += this.vy;

        // Apply friction
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        // Stop if very slow
        if (Math.abs(this.vx) < MIN_SPEED) this.vx = 0;
        if (Math.abs(this.vy) < MIN_SPEED) this.vy = 0;

        // Cushion collisions
        if (this.x - this.radius < TABLE.x + TABLE.cushionWidth) {
            this.x = TABLE.x + TABLE.cushionWidth + this.radius;
            this.vx = -this.vx * 0.8;
        }
        if (this.x + this.radius > TABLE.x + TABLE.width - TABLE.cushionWidth) {
            this.x = TABLE.x + TABLE.width - TABLE.cushionWidth - this.radius;
            this.vx = -this.vx * 0.8;
        }
        if (this.y - this.radius < TABLE.y + TABLE.cushionWidth) {
            this.y = TABLE.y + TABLE.cushionWidth + this.radius;
            this.vy = -this.vy * 0.8;
        }
        if (this.y + this.radius > TABLE.y + TABLE.height - TABLE.cushionWidth) {
            this.y = TABLE.y + TABLE.height - TABLE.cushionWidth - this.radius;
            this.vy = -this.vy * 0.8;
        }
    }

    draw() {
        if (this.potted) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();

        // Number on color balls
        if (this.type !== 'red' && this.type !== 'cue') {
            ctx.fillStyle = this.color === COLORS.black ? '#fff' : '#000';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(POINTS[this.type], this.x, this.y);
        }
    }

    isMoving() {
        return Math.abs(this.vx) > MIN_SPEED || Math.abs(this.vy) > MIN_SPEED;
    }
}

function initBalls() {
    balls = [];

    // Cue ball
    balls.push(new Ball(TABLE.x + TABLE.width * 0.25, TABLE.y + TABLE.height / 2, COLORS.cue, 'cue'));

    // Red balls - triangle formation
    const startX = TABLE.x + TABLE.width * 0.73;
    const startY = TABLE.y + TABLE.height / 2;
    const spacing = BALL_RADIUS * 2.1;

    let redIndex = 0;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            const x = startX + row * spacing * Math.cos(Math.PI / 6);
            const y = startY - (row * spacing / 2) + col * spacing;
            balls.push(new Ball(x, y, COLORS.red, 'red'));
            redIndex++;
        }
    }

    // Color balls
    const colorSpots = [
        { type: 'yellow', pos: { x: TABLE.x + TABLE.width * 0.25, y: TABLE.y + TABLE.height / 2 } },
        { type: 'green', pos: { x: TABLE.x + TABLE.width * 0.75, y: TABLE.y + TABLE.height / 2 } },
        { type: 'brown', pos: { x: TABLE.x + TABLE.width * 0.25, y: TABLE.y + TABLE.height * 0.2 } },
        { type: 'blue', pos: { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 } },
        { type: 'pink', pos: { x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 } },
        { type: 'black', pos: { x: TABLE.x + TABLE.width - 60, y: TABLE.y + TABLE.height / 2 } }
    ];

    colorSpots.forEach(spot => {
        balls.push(new Ball(spot.pos.x, spot.pos.y, COLORS[spot.type], 'color', spot.type));
        balls[balls.length - 1].colorType = spot.type;
    });
}

function checkPocket(ball) {
    if (ball.potted) return;

    for (const pocket of POCKETS) {
        const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
        if (dist < TABLE.pocketRadius) {
            ball.potted = true;
            ball.vx = 0;
            ball.vy = 0;
            potSequence.push(ball);
            return;
        }
    }
}

function checkBallCollision(b1, b2) {
    if (b1.potted || b2.potted) return;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.hypot(dx, dy);

    if (dist < b1.radius + b2.radius) {
        // Track first ball hit by cue
        if (b1.type === 'cue' && firstHit === null) {
            firstHit = b2;
        } else if (b2.type === 'cue' && firstHit === null) {
            firstHit = b1;
        }

        // Elastic collision
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // Rotate velocities
        const vx1 = b1.vx * cos + b1.vy * sin;
        const vy1 = b1.vy * cos - b1.vx * sin;
        const vx2 = b2.vx * cos + b2.vy * sin;
        const vy2 = b2.vy * cos - b2.vx * sin;

        // Swap x velocities
        const vx1After = vx2;
        const vx2After = vx1;

        // Rotate back
        b1.vx = vx1After * cos - vy1 * sin;
        b1.vy = vy1 * cos + vx1After * sin;
        b2.vx = vx2After * cos - vy2 * sin;
        b2.vy = vy2 * cos + vx2After * sin;

        // Separate balls
        const overlap = (b1.radius + b2.radius - dist) / 2;
        b1.x -= overlap * Math.cos(angle);
        b1.y -= overlap * Math.sin(angle);
        b2.x += overlap * Math.cos(angle);
        b2.y += overlap * Math.sin(angle);
    }
}

function respawnBall(ball) {
    if (ball.type === 'red') return; // Reds don't respawn

    const spotPos = SPOT_POSITIONS[ball.colorType];
    if (!spotPos) return;

    // Find valid position near spot
    let newX = spotPos.x;
    let newY = spotPos.y;
    let valid = false;

    for (let offset = 0; offset < 50; offset += BALL_RADIUS * 0.5) {
        valid = true;
        for (const b of balls) {
            if (b.potted || b === ball) continue;
            if (Math.hypot(b.x - newX, b.y - newY) < BALL_RADIUS * 2) {
                valid = false;
                break;
            }
        }
        if (valid) break;
        newY += BALL_RADIUS * 0.5;
        if (newY > TABLE.y + TABLE.height - BALL_RADIUS) {
            newY = spotPos.y;
            newX -= BALL_RADIUS * 0.5;
        }
    }

    if (valid) {
        ball.x = newX;
        ball.y = newY;
        ball.potted = false;
        ball.vx = 0;
        ball.vy = 0;
    }
}

function processPots() {
    let pointsScored = 0;
    let foulReason = '';

    const cueBall = balls.find(b => b.type === 'cue');
    const cuePotted = potSequence.some(b => b.type === 'cue');

    // Check cue ball potted - foul!
    if (cuePotted) {
        foul = true;
        foulReason = 'Cue ball potted!';
        cueBall.potted = false;
        cueBall.x = TABLE.x + TABLE.width * 0.25;
        cueBall.y = TABLE.y + TABLE.height / 2;
        cueBall.vx = 0;
        cueBall.vy = 0;
        placingCue = true;
    }

    // Check first ball hit
    if (!foul && firstHit) {
        const expectedType = currentBallOn === 'red' ? 'red' : 'color';
        if (expectedType === 'red' && firstHit.type !== 'red') {
            foul = true;
            foulReason = `Should hit ${currentBallOn} first!`;
        } else if (expectedType === 'color' && (!firstHit.colorType || firstHit.colorType !== currentBallOn)) {
            foul = true;
            foulReason = `Should hit ${currentBallOn} first!`;
        }
    } else if (!foul && firstHit === null && potSequence.length > 0) {
        // Hit nothing but potted something (impossible case, but safety)
        foul = true;
        foulReason = 'No ball hit!';
    }

    // Process potted balls
    const redsPotted = potSequence.filter(b => b.type === 'red');
    const colorsPotted = potSequence.filter(b => b.type === 'color');

    if (!foul && redsPotted.length > 0 && currentBallOn === 'red') {
        pointsScored += redsPotted.length * POINTS.red;
        redsRemaining -= redsPotted.length;

        if (colorsPotted.length === 1) {
            // Potted red and color - valid, add color points
            const color = colorsPotted[0];
            pointsScored += POINTS[color.colorType];
            respawnBall(color);
        } else if (colorsPotted.length > 1) {
            foul = true;
            foulReason = 'Multiple colors potted!';
        }

        // Next should be a color
        if (redsRemaining > 0 && !foul) {
            // Player must nominate a color, default to highest available
            const nominatedColor = colorsPotted.length === 1 ? colorsPotted[0].colorType : 'black';
            currentBallOn = nominatedColor;
        }
    } else if (!foul && colorsPotted.length === 1 && currentBallOn !== 'red') {
        const color = colorsPotted[0];
        if (color.colorType === currentBallOn) {
            pointsScored += POINTS[color.colorType];
            if (redsRemaining > 0) {
                respawnBall(color);
                currentBallOn = 'red';
            } else {
                // Colors clearing phase - don't respawn
                colorsOnTable = colorsOnTable.filter(c => c !== color.colorType);
                if (colorsOnTable.length === 0) {
                    endGame();
                    return;
                }
                currentBallOn = colorsOnTable[0];
            }
        } else {
            foul = true;
            foulReason = `Wrong color! Should be ${currentBallOn}`;
            respawnBall(color);
        }
    } else if (!foul && colorsPotted.length > 1 && currentBallOn !== 'red') {
        foul = true;
        foulReason = 'Multiple colors potted!';
        colorsPotted.forEach(c => respawnBall(c));
    }

    // No ball potted - just switch turns if foul
    if (potSequence.length === 0 && !foul) {
        // Check if wrong ball was hit first
        if (firstHit) {
            const expectedType = currentBallOn === 'red' ? 'red' : 'color';
            if (expectedType === 'red' && firstHit.type !== 'red') {
                foul = true;
                foulReason = `Should hit ${currentBallOn} first!`;
            }
        }
    }

    // Apply foul points to opponent
    if (foul) {
        const opponent = currentPlayer === 1 ? 2 : 1;
        const foulPoints = Math.max(4, firstHit ? (POINTS[firstHit.colorType] || 1) : 4);
        scores[opponent - 1] += foulPoints;
        message = `FOUL! ${foulReason} +${foulPoints} to Player ${opponent}`;
        switchPlayer();
    } else {
        scores[currentPlayer - 1] += pointsScored;
        if (pointsScored > 0) {
            message = `Player ${currentPlayer} scores ${pointsScored}!`;
            // Continue turn if potted correctly
        } else {
            switchPlayer();
        }
    }

    updateUI();
}

function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    if (redsRemaining > 0 && currentBallOn !== 'red') {
        currentBallOn = 'red';
    }
    breakScore = 0;
}

function endGame() {
    gameState = 'gameover';
    const winner = scores[0] > scores[1] ? 'Player 1' : scores[1] > scores[0] ? 'Player 2' : 'Draw';
    message = `Game Over! ${winner} wins! (${scores[0]} - ${scores[1]})`;
    updateUI();
}

function updateUI() {
    document.getElementById('score1').textContent = scores[0];
    document.getElementById('score2').textContent = scores[1];
    document.getElementById('player1').classList.toggle('active', currentPlayer === 1);
    document.getElementById('player2').classList.toggle('active', currentPlayer === 2);
    document.getElementById('currentTurn').textContent = `Player ${currentPlayer}'s Turn`;
    document.getElementById('ballOn').textContent = `Ball On: ${currentBallOn.charAt(0).toUpperCase() + currentBallOn.slice(1)}`;
    document.getElementById('message').textContent = message;
}

function drawTable() {
    // Outer border (wood)
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inner cushion
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.width, TABLE.height);

    // Playing surface
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(
        TABLE.x + TABLE.cushionWidth,
        TABLE.y + TABLE.cushionWidth,
        TABLE.width - TABLE.cushionWidth * 2,
        TABLE.height - TABLE.cushionWidth * 2
    );

    // Baize texture
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < canvas.width; i += 4) {
        for (let j = 0; j < canvas.height; j += 4) {
            if (Math.random() > 0.95) {
                ctx.fillRect(i, j, 2, 2);
            }
        }
    }

    // D-line and D-semicircle
    const dX = TABLE.x + TABLE.width * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dX, TABLE.y + TABLE.cushionWidth);
    ctx.lineTo(dX, TABLE.y + TABLE.height - TABLE.cushionWidth);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dX, TABLE.y + TABLE.height / 2, 60, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Baulk line spots
    const spotPositions = [
        { x: dX, y: TABLE.y + TABLE.height * 0.25 },  // Yellow
        { x: dX, y: TABLE.y + TABLE.height * 0.75 },  // Green
        { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 },  // Blue
        { x: TABLE.x + TABLE.width * 0.73, y: TABLE.y + TABLE.height / 2 },  // Pink
        { x: TABLE.x + TABLE.width - 50, y: TABLE.y + TABLE.height / 2 }  // Black
    ];

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    spotPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pockets
    POCKETS.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, TABLE.pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function drawAimLine() {
    if (gameState !== 'aiming' || placingCue) return;

    const cueBall = balls.find(b => b.type === 'cue' && !b.potted);
    if (!cueBall) return;

    const dx = mousePos.x - cueBall.x;
    const dy = mousePos.y - cueBall.y;
    const angle = Math.atan2(dy, dx);

    // Aim line
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(angle) * 300, cueBall.y + Math.sin(angle) * 300);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cue stick
    const cueLength = 150;
    const cueOffset = BALL_RADIUS + 10 + (100 - power) * 0.5;
    const cueStartX = cueBall.x - Math.cos(angle) * cueOffset;
    const cueStartY = cueBall.y - Math.sin(angle) * cueOffset;
    const cueEndX = cueStartX - Math.cos(angle) * cueLength;
    const cueEndY = cueStartY - Math.sin(angle) * cueLength;

    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cueStartX, cueStartY);
    ctx.lineTo(cueEndX, cueEndY);
    ctx.stroke();

    // Cue tip
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cueStartX, cueStartY);
    ctx.lineTo(cueStartX + Math.cos(angle) * 5, cueStartY + Math.sin(angle) * 5);
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawTable();

    // Draw balls
    balls.forEach(ball => ball.draw());

    drawAimLine();

    // Placing cue ball indicator
    if (placingCue) {
        const cueBall = balls.find(b => b.type === 'cue');
        if (cueBall) {
            ctx.beginPath();
            ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    requestAnimationFrame(draw);
}

function update() {
    let anyMoving = false;

    balls.forEach(ball => {
        ball.update();
        if (ball.isMoving()) anyMoving = true;
    });

    // Check collisions
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            checkBallCollision(balls[i], balls[j]);
        }
    }

    // Check pockets
    balls.forEach(ball => checkPocket(ball));

    // Check if all balls stopped
    if (gameState === 'moving' && !anyMoving) {
        gameState = 'aiming';
        processPots();
        potSequence = [];
        firstHit = null;
    }

    requestAnimationFrame(update);
}

function shoot() {
    if (gameState !== 'aiming') return;

    const cueBall = balls.find(b => b.type === 'cue' && !b.potted);
    if (!cueBall) return;

    if (placingCue) {
        placingCue = false;
        return;
    }

    const dx = mousePos.x - cueBall.x;
    const dy = mousePos.y - cueBall.y;
    const angle = Math.atan2(dy, dx);
    const speed = (power / 100) * MAX_POWER;

    cueBall.vx = Math.cos(angle) * speed;
    cueBall.vy = Math.sin(angle) * speed;

    gameState = 'moving';
    potSequence = [];
    firstHit = null;
    message = '';
}

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.x = (e.clientX - rect.left) * scaleX;
    mousePos.y = (e.clientY - rect.top) * scaleY;

    if (placingCue) {
        const cueBall = balls.find(b => b.type === 'cue');
        if (cueBall) {
            // Restrict to D area
            const dX = TABLE.x + TABLE.width * 0.2;
            cueBall.x = Math.min(mousePos.x, dX);
            cueBall.y = Math.max(TABLE.y + BALL_RADIUS, Math.min(TABLE.y + TABLE.height - BALL_RADIUS, mousePos.y));
        }
    }
});

canvas.addEventListener('click', (e) => {
    if (placingCue) {
        placingCue = false;
        updateUI();
        return;
    }
    shoot();
});

document.getElementById('powerSlider').addEventListener('input', (e) => {
    power = parseInt(e.target.value);
    document.getElementById('powerValue').textContent = `${power}%`;
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetGame();
});

document.getElementById('placeCueBtn').addEventListener('click', () => {
    if (gameState === 'aiming') {
        placingCue = true;
        message = 'Click on table to place cue ball (in D area)';
        updateUI();
    }
});

function resetGame() {
    scores = [0, 0];
    currentPlayer = 1;
    redsRemaining = 15;
    colorsOnTable = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
    currentBallOn = 'red';
    gameState = 'aiming';
    placingCue = false;
    message = 'New game! Player 1 starts';
    potSequence = [];
    firstHit = null;
    initBalls();
    updateUI();
}

// Initialize
initBalls();
updateUI();
update();
draw();
