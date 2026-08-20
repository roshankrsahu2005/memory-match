/* Memory Match - Concentration Game JavaScript */
document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const gameBoard = document.getElementById('game-board');
    const categorySelect = document.getElementById('category-select');
    const movesDisplay = document.getElementById('moves');
    const matchedDisplay = document.getElementById('matched');
    const restartBtn = document.getElementById('restart-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const victoryModal = document.getElementById('victory-modal');
    const playAgainBtn = document.getElementById('play-again-btn');
    
    // New elements
    const timerDisplay = document.getElementById('timer');
    const totalPairsDisplay = document.getElementById('total-pairs');
    const bestScoreDisplay = document.getElementById('best-score');
    const difficultyGroup = document.getElementById('difficulty-group');
    const muteBtn = document.getElementById('mute-btn');
    const particleCanvas = document.getElementById('particle-canvas');
    const ctx = particleCanvas.getContext('2d');
    const timeCountDisplay = document.getElementById('time-count');
    
    // Game state
    let cards = [];
    let flippedCards = [];
    let locked = false;
    let moves = 0;
    let matchedPairs = 0;
    let totalPairs = 32;
    let gridSize = 8; // Default 8x8
    
    // Timer state
    let timerInterval = null;
    let secondsElapsed = 0;
    let timerStarted = false;
    
    // Mute state
    let muted = localStorage.getItem('memoryMatch_muted') === 'true';
    
    // Category definitions with emojis - expanded lists
    const categories = {
        animals: [
            { emoji: '🦁', name: 'Lion' },
            { emoji: '🐘', name: 'Elephant' },
            { emoji: '🦊', name: 'Fox' },
            { emoji: '🐼', name: 'Panda' },
            { emoji: '🐒', name: 'Monkey' },
            { emoji: '🐬', name: 'Dolphin' },
            { emoji: '🐸', name: 'Frog' },
            { emoji: '🦉', name: 'Owl' },
            { emoji: '🐧', name: 'Penguin' },
            { emoji: '🦅', name: 'Eagle' },
            { emoji: '🦔', name: 'Hedgehog' },
            { emoji: '🦇', name: 'Bat' }
        ],
        fruits: [
            { emoji: '🍎', name: 'Apple' },
            { emoji: '🍌', name: 'Banana' },
            { emoji: '🍓', name: 'Strawberry' },
            { emoji: '🍇', name: 'Grape' },
            { emoji: '🍉', name: 'Watermelon' },
            { emoji: '🍍', name: 'Pineapple' },
            { emoji: '🥭', name: 'Mango' },
            { emoji: '🍒', name: 'Cherry' },
            { emoji: '🍑', name: 'Peach' },
            { emoji: '🍐', name: 'Pear' }
        ],
        vegetables: [
            { emoji: '🥕', name: 'Carrot' },
            { emoji: '🥦', name: 'Broccoli' },
            { emoji: '🌽', name: 'Corn' },
            { emoji: '🍆', name: 'Eggplant' },
            { emoji: '🥑', name: 'Avocado' },
            { emoji: '🍅', name: 'Tomato' },
            { emoji: '🥔', name: 'Potato' },
            { emoji: '🧄', name: 'Garlic' }
        ]
    };
    
    // Dynamically create the mixed category combining animals, fruits, and vegetables
    categories.mixed = [
        ...categories.animals,
        ...categories.fruits,
        ...categories.vegetables
    ];
    
    // Web Audio Context (lazy loaded on user interaction)
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }
    
    function playFlipSound() {
        if (muted) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) { console.error("Audio error:", e); }
    }
    
    function playMatchSound() {
        if (muted) return;
        try {
            const ctx = getAudioCtx();
            const now = ctx.currentTime;
            const notes = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, now + index * 0.07);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + index * 0.07 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.35);
                osc.start(now + index * 0.07);
                osc.stop(now + index * 0.07 + 0.35);
            });
        } catch (e) { console.error("Audio error:", e); }
    }
    
    function playMismatchSound() {
        if (muted) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(75, ctx.currentTime + 0.2);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, ctx.currentTime);
            osc.disconnect(gain);
            osc.connect(filter);
            filter.connect(gain);
            
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) { console.error("Audio error:", e); }
    }
    
    function playShuffleSound() {
        if (muted) return;
        try {
            const ctx = getAudioCtx();
            const now = ctx.currentTime;
            for (let i = 0; i < 5; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(100 + Math.random() * 300, now + i * 0.05);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + i * 0.05 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.15);
            }
        } catch (e) { console.error("Audio error:", e); }
    }
    
    // Shuffle all cards with FLIP animation
    function shuffleAndRepositionCards() {
        const cardElements = Array.from(gameBoard.children);
        if (cardElements.length === 0) return;
        
        // 1. First: Record starting positions of all elements
        const firstPositions = cardElements.map(el => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });
        
        // 2. Shuffle DOM elements
        const shuffledElements = [...cardElements];
        for (let i = shuffledElements.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledElements[i], shuffledElements[j]] = [shuffledElements[j], shuffledElements[i]];
        }
        
        // Re-append in new order
        shuffledElements.forEach(el => gameBoard.appendChild(el));
        
        // 3. Last: Record new positions of all elements
        const lastPositions = shuffledElements.map(el => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });
        
        // 4. Invert & Play
        shuffledElements.forEach((el, index) => {
            const dx = firstPositions[index].left - lastPositions[index].left;
            const dy = firstPositions[index].top - lastPositions[index].top;
            
            // Set up inversion layout (make it look like it's still at the old position)
            el.style.transition = 'none';
            const isFlipped = el.classList.contains('flipped');
            const rotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            el.style.transform = `translate(${dx}px, ${dy}px) ${rotation}`;
            
            // Trigger reflow to apply the inline styles instantly
            void el.offsetHeight;
            
            // Play: Restore smooth transition and move to the target position
            setTimeout(() => {
                el.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.transform = rotation;
                
                // Clear inline styles after animation finishes
                setTimeout(() => {
                    el.style.transition = '';
                    el.style.transform = '';
                }, 800);
            }, 20);
        });
    }
    
    // Particle System for Canvas Match sparkles
    let particles = [];
    let animationFrameId = null;
    
    function resizeCanvas() {
        const rect = gameBoard.getBoundingClientRect();
        particleCanvas.width = rect.width;
        particleCanvas.height = rect.height;
        particleCanvas.style.top = `${gameBoard.offsetTop}px`;
        particleCanvas.style.left = `${gameBoard.offsetLeft}px`;
        particleCanvas.style.width = `${rect.width}px`;
        particleCanvas.style.height = `${rect.height}px`;
    }
    
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = Math.random() * 4 + 2;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.015;
            this.gravity = 0.05;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            this.alpha -= this.decay;
            if (this.size > 0.1) this.size -= 0.05;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    function spawnMatchParticles(card1, card2) {
        resizeCanvas();
        const boardRect = gameBoard.getBoundingClientRect();
        const rect1 = card1.getBoundingClientRect();
        const rect2 = card2.getBoundingClientRect();
        
        const center1 = {
            x: (rect1.left - boardRect.left) + rect1.width / 2,
            y: (rect1.top - boardRect.top) + rect1.height / 2
        };
        const center2 = {
            x: (rect2.left - boardRect.left) + rect2.width / 2,
            y: (rect2.top - boardRect.top) + rect2.height / 2
        };
        
        const colors = ['#6c5ce7', '#00cec9', '#f72585', '#2ecc71', '#ffffff'];
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(center1.x, center1.y, colors[Math.floor(Math.random() * colors.length)]));
            particles.push(new Particle(center2.x, center2.y, colors[Math.floor(Math.random() * colors.length)]));
        }
        if (!animationFrameId) {
            updateParticles();
        }
    }
    
    function updateParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update();
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            } else {
                p.draw();
            }
        }
        if (particles.length > 0) {
            animationFrameId = requestAnimationFrame(updateParticles);
        } else {
            animationFrameId = null;
        }
    }
    
    // Timer stopwatch logic
    function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
        timerStarted = true;
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    function resetTimer() {
        stopTimer();
        secondsElapsed = 0;
        timerStarted = false;
        updateTimerDisplay();
    }
    function updateTimerDisplay() {
        const mins = Math.floor(secondsElapsed / 60);
        const secs = secondsElapsed % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    // High Scores persistence
    function updateHighScoreDisplay() {
        const bestMoves = localStorage.getItem(`memoryMatch_best_moves_${gridSize}`);
        const bestTime = localStorage.getItem(`memoryMatch_best_time_${gridSize}`);
        if (bestMoves && bestTime) {
            bestScoreDisplay.textContent = `${bestMoves} moves (${bestTime})`;
        } else {
            bestScoreDisplay.textContent = '-';
        }
    }
    function saveHighScoreIfBetter() {
        const bestMovesStr = localStorage.getItem(`memoryMatch_best_moves_${gridSize}`);
        const bestMoves = bestMovesStr ? parseInt(bestMovesStr) : Infinity;
        const bestTimeStr = localStorage.getItem(`memoryMatch_best_time_${gridSize}`);
        let bestTimeSecs = Infinity;
        if (bestTimeStr) {
            const [m, s] = bestTimeStr.split(':').map(Number);
            bestTimeSecs = m * 60 + s;
        }
        const currentMins = Math.floor(secondsElapsed / 60);
        const currentSecs = secondsElapsed % 60;
        const currentTimeStr = `${String(currentMins).padStart(2, '0')}:${String(currentSecs).padStart(2, '0')}`;
        
        if (moves < bestMoves || (moves === bestMoves && secondsElapsed < bestTimeSecs)) {
            localStorage.setItem(`memoryMatch_best_moves_${gridSize}`, moves);
            localStorage.setItem(`memoryMatch_best_time_${gridSize}`, currentTimeStr);
            updateHighScoreDisplay();
            return true;
        }
        return false;
    }
    
    // Initialize game
    function initGame(category = 'animals') {
        const categoryCards = categories[category];
        totalPairs = (gridSize * gridSize) / 2;
        
        // Resize columns of game board
        gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        
        // Select emojis, repeating category cards if necessary
        const selectedEmojis = [];
        for (let i = 0; i < totalPairs; i++) {
            const cardObj = categoryCards[i % categoryCards.length];
            selectedEmojis.push(cardObj.emoji);
        }
        
        // Build cards array by duplicating to create pairs
        cards = [];
        selectedEmojis.forEach(emoji => {
            cards.push({ emoji: emoji, id: Math.random() });
            cards.push({ emoji: emoji, id: Math.random() });
        });
        
        shuffleCards();
        
        // Reset game state
        flippedCards = [];
        locked = false;
        moves = 0;
        matchedPairs = 0;
        
        // Reset Timer and Scores
        resetTimer();
        totalPairsDisplay.textContent = totalPairs;
        updateHighScoreDisplay();
        
        // Update UI
        movesDisplay.textContent = moves;
        matchedDisplay.textContent = matchedPairs;
        
        // Clear board
        gameBoard.innerHTML = '';
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles = [];
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Generate cards
        cards.forEach(cardData => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.emoji = cardData.emoji;
            cardElement.innerHTML = `
                <div class="front">${cardData.emoji}</div>
                <div class="back"></div>
            `;
            cardElement.addEventListener('click', () => flipCard(cardElement));
            gameBoard.appendChild(cardElement);
        });
    }
    
    // Fisher-Yates shuffle
    function shuffleCards() {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }
    
    // Flip card function
    function flipCard(card) {
        if (card.classList.contains('flipped') || locked) return;
        
        // Start timer on first card flip
        if (!timerStarted) {
            startTimer();
        }
        
        playFlipSound();
        card.classList.add('flipped');
        flippedCards.push(card);
        
        if (flippedCards.length === 2) {
            moves++;
            movesDisplay.textContent = moves;
            checkForMatch();
        }
    }
    
    // Check for match
    function checkForMatch() {
        const [card1, card2] = flippedCards;
        
        if (card1.dataset.emoji === card2.dataset.emoji) {
            // Match found!
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            matchedDisplay.textContent = matchedPairs;
            flippedCards = [];
            
            playMatchSound();
            spawnMatchParticles(card1, card2);
            
            // Check for victory
            if (matchedPairs === totalPairs) {
                stopTimer();
                saveHighScoreIfBetter();
                setTimeout(showVictory, 500);
            }
        } else {
            // No match
            locked = true;
            playMismatchSound();
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                locked = false;
                flippedCards = [];
            }, 1000);
        }
    }
    
    // Show victory modal
    function showVictory() {
        const movesCount = document.getElementById('moves-count');
        movesCount.textContent = moves;
        timeCountDisplay.textContent = timerDisplay.textContent;
        
        // Rank calculation
        const rankBadge = document.getElementById('victory-rank');
        const rankLabel = document.getElementById('victory-rank-label');
        
        // Reset rank classes
        rankBadge.className = 'rank-badge';
        
        let rank = 'D';
        let label = 'Keep Practicing!';
        let rankClass = 'rank-d';
        
        const ratio = moves / totalPairs;
        
        if (moves === totalPairs) {
            rank = 'S+';
            label = 'Mind Reader!';
            rankClass = 'rank-s-plus';
        } else if (ratio <= 1.4) {
            rank = 'S';
            label = 'Mastermind!';
            rankClass = 'rank-s';
        } else if (ratio <= 1.8) {
            rank = 'A';
            label = 'Sharp Memory!';
            rankClass = 'rank-a';
        } else if (ratio <= 2.3) {
            rank = 'B';
            label = 'Great Job!';
            rankClass = 'rank-b';
        } else if (ratio <= 2.9) {
            rank = 'C';
            label = 'Good Effort!';
            rankClass = 'rank-c';
        }
        
        rankBadge.textContent = rank;
        rankLabel.textContent = label;
        rankBadge.classList.add(rankClass);
        
        victoryModal.classList.add('active');
        victoryModal.classList.remove('hidden');
    }
    
    // Hide victory modal and restart
    function hideVictory() {
        victoryModal.classList.add('hidden');
        victoryModal.classList.remove('active');
        initGame(categorySelect.value);
    }
    
    // Update mute button SVG icon based on state
    function updateMuteButtonUI() {
        if (muted) {
            muteBtn.classList.add('muted');
            muteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
            `;
        } else {
            muteBtn.classList.remove('muted');
            muteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
            `;
        }
    }
    
    // Handle difficulty selection
    difficultyGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.diff-btn');
        if (!btn) return;
        
        // Set active state on button
        difficultyGroup.querySelectorAll('.diff-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        
        // Change grid size and restart
        gridSize = parseInt(btn.dataset.grid);
        initGame(categorySelect.value);
    });
    
    // Handle mute toggle
    muteBtn.addEventListener('click', () => {
        muted = !muted;
        localStorage.setItem('memoryMatch_muted', muted);
        updateMuteButtonUI();
        getAudioCtx();
    });
    
    // Resize canvas dynamically on window change
    window.addEventListener('resize', () => {
        if (particleCanvas.width > 0) {
            resizeCanvas();
        }
    });
    
    // Event listeners
    categorySelect.addEventListener('change', (e) => {
        initGame(e.target.value);
    });
    
    restartBtn.addEventListener('click', () => {
        initGame(categorySelect.value);
    });
    
    shuffleBtn.addEventListener('click', () => {
        if (locked) return;
        if (!timerStarted) {
            startTimer();
        }
        locked = true;
        playShuffleSound();
        shuffleAndRepositionCards();
        setTimeout(() => {
            locked = false;
        }, 1000);
    });
    
    playAgainBtn.addEventListener('click', () => {
        hideVictory();
    });
    
    victoryModal.addEventListener('click', (e) => {
        if (e.target === victoryModal) {
            hideVictory();
        }
    });
    
    // Initial mute UI setup
    updateMuteButtonUI();
    
    // Initialize with default category and grid
    initGame('mixed');
});