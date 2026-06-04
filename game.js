// Snooker Game - Enhanced Version
// Complete physics-based snooker simulation

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas setup
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Table configuration
const CUSHION = 28;
const TABLE = {
    x: CUSHION,
    y: CUSHION,
    width: CANVAS_WIDTH - CUSHION * 2,
    height: CANVAS_HEIGHT - CUSHION * 2,
    pocketRadius: 16
};

// Ball properties
const BALL_RADIUS = 8;
const FRICTION = 0.984;
const MIN_SPEED = 0.06;
const MAX_POWER = 15;

// Pocket positions
const POCKETS = [
    { x: TABLE.x + 2, y: TABLE.y + 2 },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y - 3 },
    { x: TABLE.x + TABLE.width - 2, y: TABLE.y + 2 },
    { x: TABLE.x + 2, y: TABLE.y + TABLE.height - 2 },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height + 3 },
    { x: TABLE.x + TABLE.width - 2, y: TABLE.y + TABLE.height - 2 }
];

// Ball colors
const COLORS = {
    cue: '#FFFFFF',
    red: '#E53935',
    yellow: '#FDD835',
    green: '#43A047',
    brown: '#8D6E63',
    blue: '#1E88E5',
    pink: '#D81B60',
    black: '#212121'
};

// Ball values and names
const BALL_DATA = {
    'red': { value: 1, name: 'Red' },
    'yellow': { value: 2, name: 'Yellow' },
    'green': { value: 3, name: 'Green' },
    'brown': { value: 4, name: 'Brown' },
    'blue': { value: 5, name: 'Blue' },
    'pink': { value: 6, name: 'Pink' },
    'black': { value: 7, name: 'Black' }
};

// Game state
let balls = [];
let currentPlayer = 1;
let scores = [0, 0];
let gameState = 'aiming';
let mousePos = { x: 0, y: 0 };
let power = 50;
let message = '';
let foul = false;
let redsRemaining = 15;
let currentBallOn = 'red';
let potSequence = [];
let firstHit = null;
let placingCue = false;
let potFlash = { active: false, ball: null, time: 0 };

// Audio context for sound effects
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    switch(type) {
        case 'hit':
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
            break;
        case 'pot':
            osc.frequency.value = 400;
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
            break;
        case 'foul':
            osc.frequency.value = 200;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
            break;
    }
}

// Ball class
class Ball {
    constructor(x, y, color, type, colorName = null) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.type = type;
        this.colorName = colorName;
        this.potted = false;
        this.radius = BALL_RADIUS;
        this.flash = 0;
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
        const left = TABLE.x + 3;
        const right = TABLE.x + TABLE.width - 3;
        const top = TABLE.y + 3;
        const bottom = TABLE.y + TABLE.height - 3;

        if (this.x - this.radius < left) {
            this.x = left + this.radius;
            this.vx = Math.abs(this.vx) * 0.85;
            playSound('hit');
        }
        if (this.x + this.radius > right) {
            this.x = right - this.radius;
            this.vx = -Math.abs(this.vx) * 0.85;
            playSound('hit');
        }
        if (this.y - this.radius < top) {
            this.y = top + this.radius;
            this.vy = Math.abs(this.vy) * 0.85;
            playSound('hit');
        }
        if (this.y + this.radius > bottom) {
            this.y = bottom - this.radius;
            this.vy = -Math.abs(this.vy) * 0.85;
            playSound('hit');
        }

        // Flash effect
        if (this.flash > 0) this.flash -= 0.05;
    }

    draw() {
        if (this.potted) return;

        // Shadow
        ctx.beginPath();
        ctx.arc(this.x + 1.5, this.y + 1.5, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Ball body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Flash effect when potted
        if (this.flash > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 + this.flash), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(this.x - 2.5, this.y - 2.5, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();

        // Value on color balls
        if (this.type === 'color' && this.colorName) {
            const data = BALL_DATA[this.colorName];
            if (data) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 7px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(data.value, this.x, this.y);
            }
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
    balls.push(new Ball(dLineX - 35, TABLE.y + TABLE.height / 2, COLORS.cue, 'cue'));

    // Red balls - triangle formation
    const apexX = TABLE.x + TABLE.width * 0.72;
    const apexY = TABLE.y + TABLE.height / 2;
    const spacing = BALL_RADIUS * 2.05;
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            const x = apexX + row * spacing * 0.866;
            const y = apexY - (row * spacing / 2) + col * spacing;
            balls.push(new Ball(x, y, COLORS.red, 'red', 'red'));
        }
    }

    // Color balls
    const colorPositions = [
        { name: 'yellow', x: dLineX, y: TABLE.y + TABLE.height * 0.25 },
        { name: 'green', x: dLineX, y: TABLE.y + TABLE.height * 0.75 },
        { name: 'brown', x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height * 0.25 },
        { name: 'blue', x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 },
        { name: 'pink', x: TABLE.x + TABLE.width * 0.72, y: TABLE.y + TABLE.height / 2 },
        { name: 'black', x: TABLE.x + TABLE.width - 35, y: TABLE.y + TABLE.height / 2 }
    ];

    colorPositions.forEach(pos => {
        balls.push(new Ball(pos.x, pos.y, COLORS[pos.name], 'color', pos.name));
    });
}

function checkPocket(ball) {
    if (ball.potted) return false;

    for (const pocket of POCKETS) {
        const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
        if (dist < TABLE.pocketRadius + 3) {
            ball.potted = true;
            ball.vx = 0;
            ball.vy = 0;
            ball.flash = 1;
            potSequence.push(ball);
            playSound('pot');
            return true;
        }
    }
    return false;
}

function handleCollisions() {
    let collisionSound = false;
    
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            
            if (b1.potted || b2.potted) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < b1.radius + b2.radius && dist > 0) {
                if (!collisionSound) {
                    playSound('hit');
                    collisionSound = true;
                }
                
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

                // Separate balls
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
        'brown': { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height * 0.25 },
        'blue': { x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 },
        'pink': { x: TABLE.x + TABLE.width * 0.72, y: TABLE.y + TABLE.height / 2 },
        'black': { x: TABLE.x + TABLE.width - 35, y: TABLE.y + TABLE.height / 2 }
    };
    return spots[colorName] || null;
}

function respawnColor(ball) {
    if (ball.type !== 'color' || !ball.colorName) return;
    
    const spot = getSpotPosition(ball.colorName);
    if (!spot) return;

    // Find free position near spot
    let found = false;
    for (let offset = 0; offset < 20 && !found; offset += BALL_RADIUS * 0.7) {
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

    // Check cue ball potted
    if (cuePotted) {
        foul = true;
        foulMsg = 'Cue ball potted!';
        cueBall.potted = false;
        cueBall.x = TABLE.x + TABLE.width * 0.2;
        cueBall.y = TABLE.y + TABLE.height / 2;
        placingCue = true;
        playSound('foul');
    }

    // Check first ball hit
    if (!foul && firstHit) {
        if (currentBallOn === 'red' && firstHit.type !== 'red') {
            foul = true;
            foulMsg = 'Must hit red first!';
            foulPoints = Math.max(4, BALL_DATA[firstHit.colorName]?.value || 1);
            playSound('foul');
        } else if (currentBallOn !== 'red' && (!firstHit.colorName || firstHit.colorName !== currentBallOn)) {
            foul = true;
            foulMsg = `Must hit ${currentBallOn} first!`;
            foulPoints = Math.max(4, BALL_DATA[firstHit.colorName]?.value || BALL_DATA[currentBallOn]?.value || 4);
            playSound('foul');
        }
    }

    // Process potted balls
    const redsPotted = potSequence.filter(b => b.type === 'red');
    const colorsPotted = potSequence.filter(b => b.type === 'color');

    if (!foul && currentBallOn === 'red') {
        if (redsPotted.length > 0) {
            let points = redsPotted.length * 1;
            redsRemaining -= redsPotted.length;
            
            if (colorsPotted.length === 1) {
                const color = colorsPotted[0];
                points += BALL_DATA[color.colorName]?.value || 0;
                respawnColor(color);
            } else if (colorsPotted.length > 1) {
                foul = true;
                foulMsg = 'Multiple colors potted!';
                playSound('foul');
            }

            if (!foul) {
                scores[currentPlayer - 1] += points;
                message = points > 1 ? `Player ${currentPlayer} scores ${points}!` : '';
            }
        } else if (colorsPotted.length === 1) {
            foul = true;
            foulMsg = 'Must pot red first!';
            foulPoints = Math.max(4, BALL_DATA[colorsPotted[0].colorName]?.value || 2);
            respawnColor(colorsPotted[0]);
            playSound('foul');
        }
    } else if (!foul && currentBallOn !== 'red') {
        if (colorsPotted.length === 1) {
            const color = colorsPotted[0];
            const expectedName = currentBallOn;
            
            if (color.colorName === expectedName) {
                scores[currentPlayer - 1] += BALL_DATA[color.colorName]?.value || 0;
                message = `Player ${currentPlayer} scores ${BALL_DATA[color.colorName]?.value}!`;
                
                if (redsRemaining > 0) {
                    respawnColor(color);
                    currentBallOn = 'red';
                } else {
                    color.potted = true;
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
                foulMsg = `Wrong color! Must pot ${expectedName}`;
                foulPoints = Math.max(4, BALL_DATA[color.colorName]?.value || 2, BALL_DATA[expectedName]?.value || 4);
                respawnColor(color);
                playSound('foul');
            }
        } else if (colorsPotted.length > 1) {
            foul = true;
            foulMsg = 'Multiple colors potted!';
            colorsPotted.forEach(c => respawnColor(c));
            playSound('foul');
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

    // Check game end
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
    message = ` ${winner} wins! Final: ${scores[0]} - ${scores[1]}`;
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
    
    const ballName = BALL_DATA[currentBallOn]?.name || currentBallOn;
    document.getElementById('ballOn').textContent = `Ball On: ${ballName}`;
    document.getElementById('gameMessage').textContent = message;
}

function drawTable() {
    // Wood frame
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Cushion
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.width, TABLE.height);
    
    // Baize
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(TABLE.x + 2, TABLE.y + 2, TABLE.width - 4, TABLE.height - 4);

    // D-line
    const dLineX = TABLE.x + TABLE.width * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dLineX, TABLE.y);
    ctx.lineTo(dLineX, TABLE.y + TABLE.height);
    ctx.stroke();

    // D-semicircle
    ctx.beginPath();
    ctx.arc(dLineX, TABLE.y + TABLE.height / 2, 45, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Spots
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const spots = [
        { x: dLineX, y: TABLE.y + TABLE.height * 0.25 },
        { x: dLineX, y: TABLE.y + TABLE.height * 0.75 },
        { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height * 0.25 },
        { x: TABLE.x + TABLE.width * 0.6, y: TABLE.y + TABLE.height / 2 },
        { x: TABLE.x + TABLE.width * 0.72, y: TABLE.y + TABLE.height / 2 },
        { x: TABLE.x + TABLE.width - 35, y: TABLE.y + TABLE.height / 2 }
    ];

    spots.forEach(spot => {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pockets
    POCKETS.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, TABLE.pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();
        ctx.strokeStyle = '#2c2c2c';
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

    // Aim line
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(angle) * 300, cueBall.y + Math.sin(angle) * 300);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cue stick
    const pullBack = (100 - power) * 0.25;
    const cueOffset = BALL_RADIUS + 5 + pullBack;
    const cueLength = 140;
    const startX = cueBall.x - Math.cos(angle) * cueOffset;
    const startY = cueBall.y - Math.sin(angle) * cueOffset;
    const endX = startX - Math.cos(angle) * cueLength;
    const endY = startY - Math.sin(angle) * cueLength;

    // Cue body
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Cue tip
    ctx.strokeStyle = '#1E88E5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX - Math.cos(angle) * 5, startY - Math.sin(angle) * 5);
    ctx.stroke();
}

function drawPlacingIndicator() {
    if (!placingCue) return;
    
    const cueBall = balls.find(b => b.type === 'cue');
    if (!cueBall) return;

    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#4CAF50';
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

    // Check if stopped
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

    // Initialize audio on first shot
    initAudio();

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
        message = 'Click on table to place cue ball';
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
