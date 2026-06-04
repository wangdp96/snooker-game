// Snooker Game - Complete Game Logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 440;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Table dimensions
const CUSHION = 30;
const TABLE = {
    x: CUSHION,
    y: CUSHION,
    width: CANVAS_WIDTH - CUSHION * 2,
    height: CANVAS_HEIGHT - CUSHION * 2,
    pocketRadius: 18
};

// Ball properties
const BALL_RADIUS = 9;
const FRICTION = 0.985;
const MIN_SPEED = 0.05;
const MAX_POWER = 16;

// Pocket positions
const POCKETS = [
    { x: TABLE.x + 4, y: TABLE.y + 4 },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y - 2 },
    { x: TABLE.x + TABLE.width - 4, y: TABLE.y + 4 },
    { x: TABLE.x + 4, y: TABLE.y + TABLE.height - 4 },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height + 2 },
    { x: TABLE.x + TABLE.width - 4, y: TABLE.y + TABLE.height - 4 }
];

// Ball colors
const COLORS = {
    cue: '#FFFFFF',
    red: '#DC2626',
    yellow: '#FBBF24',
    green: '#22C55E',
    brown: '#92400E',
    blue: '#3B82F6',
    pink: '#EC4899',
    black: '#1F2937'
};

// Ball values
const BALL_VALUES = {
    'red': 1,
    'yellow': 2,
    'green': 3,
    'brown': 4,
    'blue': 5,
    'pink': 6,
    'black': 7
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
let currentBallOn = 'red';
let potSequence = [];
let firstHit = null;
let placingCue = false;

class Ball {
    constructor(x, y, color, type, value = null) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.type = type; // 'cue', 'red', 'color'
        this.value = value; // point value for colors
        this.potted = false;
        this.radius = BALL_RADIUS;
    }

    update() {
        if (this.potted) return;

        this.x += this.vx;
        this.y += this.vy;

        // Friction
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        // Stop threshold
        if (Math.abs(this.vx) < MIN_SPEED) this.vx = 0;
        if (Math.abs(this.vy) < MIN_SPEED) this.vy = 0;

        // Cushion collisions
        const left = TABLE.x + 4;
        const right = TABLE.x + TABLE.width - 4;
        const top = TABLE.y + 4;
        const bottom = TABLE.y + TABLE.height - 4;

        if (this.x - this.radius < left) {
            this.x = left + this.radius;
            this.vx = Math.abs(this.vx) * 0.85;
        }
        if (this.x + this.radius > right) {
            this.x = right - this.radius;
            this.vx = -Math.abs(this.vx) * 0.85;
        }
        if (this.y - this.radius < top) {
            this.y = top + this.radius;
            this.vy = Math.abs(this.vy) * 0.85;
        }
        if (this.y + this.radius > bottom) {
            this.y = bottom - this.radius;
            this.vy = -Math.abs(this.vy) * 0.85;
        }
    }

    draw() {
        if (this.potted) return;

        // Shadow
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();

        // Ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 3, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();

        // Value on color balls (not cue, not red)
        if (this.type === 'color' && this.value !== null) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.value, this.x, this.y + 1);
        }
    }

    isMoving() {
        return Math.abs(this.vx) > MIN_SPEED || Math.abs(this.vy) > MIN_SPEED;
    }
}

function setupBalls() {
    balls = [];

    // Cue ball in D-area
    const dLineX = TABLE.x + TABLE.width * 0.2;
    balls.push(new Ball(dLineX - 30, TABLE.y + TABLE.height / 2, COLORS.cue, 'cue'));

    // Red balls - triangle formation at the spot
    const apexX = TABLE.x + TABLE.width * 0.75;
    const apexY = TABLE.y + TABLE.height / 2;
    const spacing = BALL_RADIUS * 2.1;
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            const x = apexX + row * spacing * 0.866;
            const y = apexY - (row * spacing / 2) + col * spacing;
            balls.push(new Ball(x, y, COLORS.red, 'red'));
        }
    }

    // Color balls with their values
    const colorBalls = [
        { color: 'yellow', x: dLineX, y: TABLE.y + TABLE.height * 0.25, value: 2 },
        { color: 'green', x: dLineX, y: TABLE.y + TABLE.height * 0.75, value: 3 },
        { color: 'brown', x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2, value: 4 },
        { color: 'blue', x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2, value: 5 },
        { color: 'pink', x: TABLE.x + TABLE.width * 0.75, y: TABLE.y + TABLE.height / 2, value: 6 },
        { color: 'black', x: TABLE.x + TABLE.width - 40, y: TABLE.y + TABLE.height / 2, value: 7 }
    ];

    colorBalls.forEach(c => {
        balls.push(new Ball(c.x, c.y, COLORS[c.color], 'color', c.value));
    });
}

function checkPocket(ball) {
    if (ball.potted) return;

    for (const pocket of POCKETS) {
        const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
        if (dist < TABLE.pocketRadius + 4) {
            ball.potted = true;
            ball.vx = 0;
            ball.vy = 0;
            potSequence.push(ball);
            return true;
        }
    }
    return false;
}

function handleCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            
            if (b1.potted || b2.potted) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < b1.radius + b2.radius && dist > 0) {
                // Track first hit by cue
                if (firstHit === null) {
                    if (b1.type === 'cue') firstHit = b2;
                    else if (b2.type === 'cue') firstHit = b1;
                }

                // Elastic collision
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                const vx1 = b1.vx * cos + b1.vy * sin;
                const vy1 = b1.vy * cos - b1.vx * sin;
                const vx2 = b2.vx * cos + b2.vy * sin;
                const vy2 = b2.vy * cos - b2.vx * sin;

                b1.vx = vx2 * cos - vy1 * sin;
                b1.vy = vy1 * cos + vx2 * sin;
                b2.vx = vx1 * cos - vy2 * sin;
                b2.vy = vy2 * cos + vx1 * sin;

                // Separate
                const overlap = (b1.radius + b2.radius - dist) / 2;
                b1.x -= overlap * Math.cos(angle);
                b1.y -= overlap * Math.sin(angle);
                b2.x += overlap * Math.cos(angle);
                b2.y += overlap * Math.sin(angle);
            }
        }
    }
}

function getSpotPosition(colorName) {
    const dLineX = TABLE.x + TABLE.width * 0.2;
    const spots = {
        'yellow': { x: dLineX, y: TABLE.y + TABLE.height * 0.25 },
        'green': { x: dLineX, y: TABLE.y + TABLE.height * 0.75 },
        'brown': { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 },
        'blue': { x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 },
        'pink': { x: TABLE.x + TABLE.width * 0.75, y: TABLE.y + TABLE.height / 2 },
        'black': { x: TABLE.x + TABLE.width - 40, y: TABLE.y + TABLE.height / 2 }
    };
    return spots[colorName] || null;
}

function getColorName(value) {
    const map = { 2: 'yellow', 3: 'green', 4: 'brown', 5: 'blue', 6: 'pink', 7: 'black' };
    return map[value] || 'black';
}

function respawnColor(ball) {
    if (ball.type !== 'color') return;
    
    const colorName = getColorName(ball.value);
    const spot = getSpotPosition(colorName);
    if (!spot) return;

    // Find free position near spot
    let found = false;
    for (let offset = 0; offset < 25 && !found; offset += BALL_RADIUS * 0.8) {
        const testX = spot.x;
        const testY = spot.y - offset;
        
        found = true;
        for (const b of balls) {
            if (b === ball || b.potted) continue;
            if (Math.hypot(b.x - testX, b.y - testY) < BALL_RADIUS * 2.2) {
                found = false;
                break;
            }
        }
        
        if (found) {
            ball.x = testX;
            ball.y = testY;
        }
    }

    if (found) {
        ball.potted = false;
        ball.vx = 0;
        ball.vy = 0;
    }
}

function processShot() {
    const cueBall = balls.find(b => b.type === 'cue');
    const cuePotted = potSequence.some(b => b.type === 'cue');
    
    foul = false;
    let foulPoints = 4;
    let foulMsg = '';

    // Check foul: cue ball potted
    if (cuePotted) {
        foul = true;
        foulMsg = 'Cue ball potted!';
        cueBall.potted = false;
        cueBall.x = TABLE.x + TABLE.width * 0.2;
        cueBall.y = TABLE.y + TABLE.height / 2;
        placingCue = true;
    }

    // Check foul: wrong ball hit first
    if (!foul && firstHit) {
        if (currentBallOn === 'red' && firstHit.type !== 'red') {
            foul = true;
            foulMsg = 'Must hit red first!';
            foulPoints = Math.max(4, firstHit.value || 1);
        } else if (currentBallOn !== 'red' && (firstHit.type !== 'color' || firstHit.value !== BALL_VALUES[currentBallOn])) {
            foul = true;
            const expectedValue = BALL_VALUES[currentBallOn] || 4;
            foulMsg = `Must hit ${currentBallOn} first!`;
            foulPoints = Math.max(4, firstHit.value || expectedValue);
        }
    }

    // Process potted balls
    const redsPotted = potSequence.filter(b => b.type === 'red');
    const colorsPotted = potSequence.filter(b => b.type === 'color');

    if (!foul && currentBallOn === 'red') {
        if (redsPotted.length > 0) {
            // Potted red(s)
            let points = redsPotted.length * 1;
            redsRemaining -= redsPotted.length;
            
            if (colorsPotted.length === 1) {
                // Potted red and color
                const color = colorsPotted[0];
                points += color.value;
                respawnColor(color);
            } else if (colorsPotted.length > 1) {
                foul = true;
                foulMsg = 'Multiple colors potted!';
            }

            if (!foul) {
                scores[currentPlayer - 1] += points;
                message = points > 1 ? `Player ${currentPlayer} scores ${points}!` : '';
                // Continue with red
            }
            
        } else if (colorsPotted.length === 1) {
            // Potted color instead of red - foul
            foul = true;
            foulMsg = 'Must pot red first!';
            foulPoints = Math.max(4, colorsPotted[0].value);
            respawnColor(colorsPotted[0]);
        }
    } else if (!foul && currentBallOn !== 'red') {
        if (colorsPotted.length === 1) {
            const color = colorsPotted[0];
            const expectedValue = BALL_VALUES[currentBallOn];
            
            if (color.value === expectedValue) {
                // Correct color potted
                scores[currentPlayer - 1] += color.value;
                message = `Player ${currentPlayer} scores ${color.value}!`;
                
                if (redsRemaining > 0) {
                    respawnColor(color);
                    currentBallOn = 'red';
                } else {
                    // Colors sequence - keep potted
                    color.potted = true;
                    // Move to next color in sequence
                    const colorOrder = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
                    const currentIdx = colorOrder.indexOf(currentBallOn);
                    if (currentIdx < colorOrder.length - 1) {
                        currentBallOn = colorOrder[currentIdx + 1];
                    } else {
                        endGame();
                        return;
                    }
                }
            } else {
                foul = true;
                foulMsg = `Wrong color! Must pot ${currentBallOn}`;
                foulPoints = Math.max(4, color.value, BALL_VALUES[currentBallOn]);
                respawnColor(color);
            }
        } else if (colorsPotted.length > 1) {
            foul = true;
            foulMsg = 'Multiple colors potted!';
            colorsPotted.forEach(c => respawnColor(c));
        }
    }

    if (foul) {
        const opponent = currentPlayer === 1 ? 2 : 1;
        scores[opponent - 1] += foulPoints;
        message = `FOUL! ${foulMsg} (+${foulPoints} to Player ${opponent})`;
        switchPlayer();
    } else if (potSequence.length === 0 && !foul) {
        switchPlayer();
    }

    // Check if all balls cleared
    const remainingBalls = balls.filter(b => !b.potted && b.type !== 'cue');
    if (remainingBalls.length === 0 && !foul) {
        endGame();
    }

    updateUI();
}

function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    if (redsRemaining > 0) currentBallOn = 'red';
    message = '';
}

function endGame() {
    gameState = 'gameover';
    const winner = scores[0] > scores[1] ? 'Player 1' : scores[1] > scores[0] ? 'Player 2' : 'Draw';
    message = ` Game Over! ${winner} wins! Final: ${scores[0]} - ${scores[1]}`;
    updateUI();
}

function updateUI() {
    document.getElementById('score1').textContent = scores[0];
    document.getElementById('score2').textContent = scores[1];
    document.getElementById('turn1').textContent = currentPlayer === 1 ? '● YOUR TURN' : '';
    document.getElementById('turn2').textContent = currentPlayer === 2 ? '● YOUR TURN' : '';
    document.getElementById('turn1').classList.toggle('visible', currentPlayer === 1);
    document.getElementById('turn2').classList.toggle('visible', currentPlayer === 2);
    
    const p1Panel = document.querySelector('.player1-panel');
    const p2Panel = document.querySelector('.player2-panel');
    p1Panel.classList.toggle('active', currentPlayer === 1);
    p2Panel.classList.toggle('active', currentPlayer === 2);

    document.getElementById('turnInfo').textContent = `Player ${currentPlayer}'s Turn`;
    document.getElementById('ballOn').textContent = `Ball On: ${currentBallOn.charAt(0).toUpperCase() + currentBallOn.slice(1)}`;
    document.getElementById('gameMessage').textContent = message;
}

function drawTable() {
    // Wood frame background
    ctx.fillStyle = '#78350F';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Cushion
    ctx.fillStyle = '#166534';
    ctx.fillRect(TABLE.x - 2, TABLE.y - 2, TABLE.width + 4, TABLE.height + 4);
    
    // Baize (playing surface)
    ctx.fillStyle = '#15803D';
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.width, TABLE.height);

    // D-line
    const dLineX = TABLE.x + TABLE.width * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dLineX, TABLE.y);
    ctx.lineTo(dLineX, TABLE.y + TABLE.height);
    ctx.stroke();

    // D-semicircle
    ctx.beginPath();
    ctx.arc(dLineX, TABLE.y + TABLE.height / 2, 50, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Spots (small circles for color positions)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const spots = [
        { x: dLineX, y: TABLE.y + TABLE.height * 0.25 },
        { x: dLineX, y: TABLE.y + TABLE.height * 0.75 },
        { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height / 2 },
        { x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 },
        { x: TABLE.x + TABLE.width * 0.75, y: TABLE.y + TABLE.height / 2 },
        { x: TABLE.x + TABLE.width - 40, y: TABLE.y + TABLE.height / 2 }
    ];

    spots.forEach(spot => {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pockets
    POCKETS.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, TABLE.pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#030712';
        ctx.fill();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function drawAimGuide() {
    if (gameState !== 'aiming' || placingCue) return;

    const cueBall = balls.find(b => b.type === 'cue' && !b.potted);
    if (!cueBall) return;

    const dx = mousePos.x - cueBall.x;
    const dy = mousePos.y - cueBall.y;
    const angle = Math.atan2(dy, dx);

    // Aim line (dashed)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(angle) * 350, cueBall.y + Math.sin(angle) * 350);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cue stick
    const pullBack = (100 - power) * 0.3;
    const cueOffset = BALL_RADIUS + 6 + pullBack;
    const cueLength = 160;
    const startX = cueBall.x - Math.cos(angle) * cueOffset;
    const startY = cueBall.y - Math.sin(angle) * cueOffset;
    const endX = startX - Math.cos(angle) * cueLength;
    const endY = startY - Math.sin(angle) * cueLength;

    // Cue body (wood color)
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Cue tip (blue/green ferrule)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX - Math.cos(angle) * 6, startY - Math.sin(angle) * 6);
    ctx.stroke();
}

function drawPlacingIndicator() {
    if (!placingCue) return;
    
    const cueBall = balls.find(b => b.type === 'cue');
    if (!cueBall) return;

    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function gameLoop() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawTable();

    // Update physics
    let moving = false;
    balls.forEach(ball => {
        ball.update();
        if (ball.isMoving()) moving = true;
    });

    handleCollisions();
    balls.forEach(ball => checkPocket(ball));

    // Check if all stopped
    if (gameState === 'moving' && !moving) {
        gameState = 'aiming';
        processShot();
        potSequence = [];
        firstHit = null;
    }

    // Draw balls
    balls.forEach(ball => ball.draw());

    drawAimGuide();
    drawPlacingIndicator();

    requestAnimationFrame(gameLoop);
}

function shoot() {
    if (gameState !== 'aiming') return;

    const cueBall = balls.find(b => b.type === 'cue' && !b.potted);
    if (!cueBall) return;

    if (placingCue) {
        placingCue = false;
        gameState = 'aiming';
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
            const dLineX = TABLE.x + TABLE.width * 0.2;
            cueBall.x = Math.min(mousePos.x, dLineX);
            cueBall.y = Math.max(
                TABLE.y + BALL_RADIUS + 2,
                Math.min(TABLE.y + TABLE.height - BALL_RADIUS - 2, mousePos.y)
            );
        }
    }
});

canvas.addEventListener('click', () => {
    if (placingCue) {
        placingCue = false;
        gameState = 'aiming';
        updateUI();
        return;
    }
    shoot();
});

document.getElementById('powerSlider').addEventListener('input', (e) => {
    power = parseInt(e.target.value);
    document.getElementById('powerValue').textContent = `${power}%`;
});

document.getElementById('resetBtn').addEventListener('click', resetGame);

document.getElementById('placeCueBtn').addEventListener('click', () => {
    if (gameState === 'aiming') {
        placingCue = true;
        gameState = 'placing';
        message = 'Click on table to place cue ball (in D area)';
        updateUI();
    }
});

function resetGame() {
    scores = [0, 0];
    currentPlayer = 1;
    redsRemaining = 15;
    currentBallOn = 'red';
    gameState = 'aiming';
    placingCue = false;
    message = 'New game! Player 1 starts';
    potSequence = [];
    firstHit = null;
    setupBalls();
    updateUI();
}

// Initialize
setupBalls();
updateUI();
gameLoop();
