class ChristmasTetris {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Размеры игрового поля
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 32;
        
        // Инициализация времени для gameLoop
        this.lastTime = 0;
        
        // Добавляем новогодние элементы
        this.snowflakes = this.createSnowflakes();
        
        // Праздничные фигуры (добавляем в массив pieces)
        this.pieces = [
            [[1,1,1,1]],           // I - сосулька
            [[1,1],[1,1]],         // O - подарок
            [[0,1,0],[1,1,1]],     // T - ёлка
            [[1,0],[1,0],[1,1]],   // L - посох
            [[0,1],[0,1],[1,1]],   // J - конфета
            [[1,1,0],[0,1,1]],     // S - снежинка
            [[0,1,1],[1,1,0]]      // Z - звезда
        ];

        // Праздничные цвета
        this.colors = [
            '#FF0000', // Красный
            '#2F8F2F', // Тёмно-зелёный (ёлочный)
            '#FFD700', // Золотой
            '#87CEEB', // Голубой (ледяной)
            '#FF69B4', // Розовый
            '#9370DB', // Пурпурный
            '#00FF7F'  // Весенне-зелёный
        ];
        
        // Обновляем параметры падения
        this.dropCounter = 0;
        this.dropInterval = 1000; // Начальная скорость падения (1 секунда)
        this.speedIncrease = 50;  // На сколько уменьшается интервал с каждым уровнем
        this.linesPerLevel = 10;  // Сколько линий нужно для следующего уровня
        this.linesCleared = 0;    // Счетчик очищенных линий
        
        // Добавляем обработчики клавиш
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Добавляем праздничные звуки
        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            rotate: new Audio('sounds/rotate.mp3'),
            drop: new Audio('sounds/drop.mp3'),
            clear: new Audio('sounds/jingle.mp3'),
            levelUp: new Audio('sounds/bells.mp3'),
            gameOver: new Audio('sounds/ho-ho-ho.mp3'),
            background: new Audio('sounds/christmas-music.mp3')
        };
        
        // Настраиваем звуки
        this.initSounds();
        
        this.init();
    }

    initSounds() {
        // Настраиваем фоновую музыку
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.3;
        
        // Настраиваем громкость эффектов
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (key !== 'background') {
                sound.volume = 0.4;
            }
        });

        // Добавляем кнопку включения/выключения звука
        this.addSoundToggle();
    }

    addSoundToggle() {
        const soundButton = document.createElement('button');
        soundButton.innerHTML = '🔊';
        soundButton.className = 'sound-toggle';
        soundButton.onclick = () => {
            if (this.sounds.background.paused) {
                this.sounds.background.play();
                soundButton.innerHTML = '🔊';
            } else {
                this.sounds.background.pause();
                soundButton.innerHTML = '🔇';
            }
        };
        document.querySelector('.game-info').appendChild(soundButton);
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound && !this.sounds.background.paused) { // Проигрываем, только если звук включен
            sound.currentTime = 0; // Сбрасываем время для возможности повторного проигрывания
            sound.play().catch(() => {}); // Игнорируем ошибки автовоспроизведения
        }
    }

    init() {
        // Инициализация игрового поля
        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.level = 1;
        
        // Создание первой фигуры
        this.currentPiece = this.createNewPiece();
        this.nextPiece = this.createNewPiece();
        
        // Запуск игрового цикла
        this.gameLoop();
    }

    createSnowflakes() {
        const snowflakes = [];
        for (let i = 0; i < 50; i++) {
            snowflakes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 2,
                speed: Math.random() * 2 + 1
            });
        }
        return snowflakes;
    }

    drawSnowflakes() {
        this.ctx.fillStyle = '#FFFFFF';
        this.snowflakes.forEach(flake => {
            this.ctx.beginPath();
            this.ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Движение снежинок
            flake.y += flake.speed;
            flake.x += Math.sin(flake.y / 30) * 0.5;

            // Возвращаем снежинки наверх
            if (flake.y > this.canvas.height) {
                flake.y = 0;
                flake.x = Math.random() * this.canvas.width;
            }
        });
    }

    createNewPiece() {
        const piece = {
            shape: this.pieces[Math.floor(Math.random() * this.pieces.length)],
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            x: Math.floor(this.cols / 2) - 1,
            y: 0
        };
        
        // Добавляем эффект появления
        this.showSpawnEffect(piece);
        return piece;
    }

    showSpawnEffect(piece) {
        const x = (piece.x + 1) * this.cellSize;
        const y = piece.y * this.cellSize;
        
        this.ctx.fillStyle = 'white';
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }

    update(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        // Обновляем счетчик падения
        this.dropCounter += deltaTime;
        
        // Если прошло достаточно времени - роняем фигуру
        if (this.dropCounter > this.dropInterval) {
            this.dropPiece();
            this.dropCounter = 0;
        }
    }

    draw() {
        // Очищаем поле
        this.ctx.fillStyle = '#001428';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем снежинки
        this.drawSnowflakes();

        // Рисуем сетку
        this.drawGrid();
        
        // Рисуем текущую фигуру
        this.drawPiece(this.currentPiece, this.ctx, false);
        
        // Очищаем и рисуем следующую фигуру
        this.nextCtx.fillStyle = '#001428';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        // Добавляем сетку для следующей фигуры
        this.nextCtx.strokeStyle = 'rgba(47, 143, 47, 0.1)';
        this.nextCtx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            this.nextCtx.beginPath();
            this.nextCtx.moveTo(i * this.cellSize, 0);
            this.nextCtx.lineTo(i * this.cellSize, 5 * this.cellSize);
            this.nextCtx.stroke();
            
            this.nextCtx.beginPath();
            this.nextCtx.moveTo(0, i * this.cellSize);
            this.nextCtx.lineTo(5 * this.cellSize, i * this.cellSize);
            this.nextCtx.stroke();
        }
        
        // Рисуем следующую фигуру
        this.drawPiece(this.nextPiece, this.nextCtx, true);

        // Добавляем эффект свечения для блоков
        this.drawGlow();
    }

    drawGrid() {
        // Рисуем зафиксированные блоки
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = value;
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize - 1,
                        this.cellSize - 1
                    );
                }
            });
        });
    }

    drawPiece(piece, context, isNext = false) {
        const offset = isNext ? 2 : 0;
        context.shadowBlur = 10;
        context.shadowColor = piece.color;
        
        // Центрируем следующую фигуру в блоке предпросмотра
        let startX = piece.x;
        let startY = piece.y;
        
        if (isNext) {
            // Вычисляем центр для следующей фигуры
            startX = Math.floor((5 - piece.shape[0].length) / 2);
            startY = Math.floor((5 - piece.shape.length) / 2);
        }
        
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    // Добавляем градиент для каждого блока
                    const gradient = context.createLinearGradient(
                        (startX + x) * this.cellSize,
                        (startY + y) * this.cellSize,
                        (startX + x + 1) * this.cellSize,
                        (startY + y + 1) * this.cellSize
                    );
                    gradient.addColorStop(0, piece.color);
                    gradient.addColorStop(1, this.lightenColor(piece.color, 30));
                    
                    context.fillStyle = gradient;
                    context.fillRect(
                        (startX + x) * this.cellSize,
                        (startY + y) * this.cellSize,
                        this.cellSize - 1,
                        this.cellSize - 1
                    );
                }
            });
        });
        context.shadowBlur = 0;
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return `#${(1 << 24 | (R < 255 ? R : 255) << 16 | (G < 255 ? G : 255) << 8 | (B < 255 ? B : 255)).toString(16).slice(1)}`;
    }

    drawGlow() {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }

    dropPiece() {
        this.currentPiece.y++;
        if (this.checkCollision()) {
            this.currentPiece.y--;
            this.mergePiece();
            this.playSound('drop');
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.createNewPiece();
            
            if (this.checkCollision()) {
                this.gameOver();
            }
        }
    }

    checkCollision() {
        return this.currentPiece.shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = this.currentPiece.x + dx;
                const newY = this.currentPiece.y + dy;
                return (
                    newX < 0 ||
                    newX >= this.cols ||
                    newY >= this.rows ||
                    (newY >= 0 && this.grid[newY][newX])
                );
            });
        });
    }

    mergePiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const newY = this.currentPiece.y + y;
                    if (newY >= 0) {
                        this.grid[newY][this.currentPiece.x + x] = this.currentPiece.color;
                    }
                }
            });
        });
        this.clearLines();
    }

    clearLines() {
        let linesCleared = 0;
        outer: for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.grid[y][x]) continue outer;
            }
            
            // Удаляем заполненную линию
            this.grid.splice(y, 1);
            this.grid.unshift(Array(this.cols).fill(0));
            linesCleared++;
            y++;
        }
        
        if (linesCleared > 0) {
            this.playSound('clear');
            this.linesCleared += linesCleared;
            this.score += linesCleared * 100 * this.level; // Очки зависят от уровня
            
            // Проверяем, нужно ли повысить уровень
            if (this.linesCleared >= this.linesPerLevel) {
                this.levelUp();
            }
            
            // Обновляем отображение очков
            document.getElementById('score').textContent = this.score;
        }
    }

    handleKeyPress(event) {
        switch (event.keyCode) {
            case 37: // Влево
                this.currentPiece.x--;
                if (this.checkCollision()) {
                    this.currentPiece.x++;
                } else {
                    this.playSound('move');
                }
                break;
            case 39: // Вправо
                this.currentPiece.x++;
                if (this.checkCollision()) {
                    this.currentPiece.x--;
                } else {
                    this.playSound('move');
                }
                break;
            case 40: // Вниз
                this.dropPiece();
                this.playSound('move');
                break;
            case 38: // Вверх (вращение)
                this.rotatePiece();
                this.playSound('rotate');
                break;
            case 32: // Пробел (мгновенное падение)
                this.hardDrop();
                break;
        }
    }

    rotatePiece() {
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[row.length - 1 - i])
        );
        const previousShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;
        
        if (this.checkCollision()) {
            this.currentPiece.shape = previousShape;
        }
    }

    gameLoop(timestamp) {
        // Обновляем игру
        this.update(timestamp);
        this.draw();
        
        // Продолжаем цикл
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    levelUp() {
        this.level++;
        this.linesCleared = 0;
        
        // Увеличиваем скорость падения (уменьшаем интервал)
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * this.speedIncrease);
        
        // Обновляем отображение уровня
        document.getElementById('level').textContent = this.level;
        
        // Воспроизводим праздничный звук
        this.playSound('levelUp');
        
        // Добавляем праздничный эффект
        this.showLevelUpEffect();
    }

    showLevelUpEffect() {
        // Создаем вспышку на экране
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Можно добавить звуковой эффект, если нужно
        // this.playLevelUpSound();
    }

    gameOver() {
        this.playSound('gameOver');
        this.sounds.background.pause();
        this.sounds.background.currentTime = 0;
        
        // Показываем сообщение о конце игры
        const gameOverText = document.createElement('div');
        gameOverText.className = 'game-over';
        gameOverText.innerHTML = `
            <h2>🎄 Игра окончена! 🎄</h2>
            <p>Ваши очки: ${this.score}</p>
            <button onclick="location.reload()">Играть снова</button>
        `;
        document.body.appendChild(gameOverText);
    }

    hardDrop() {
        while (!this.checkCollision()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.mergePiece();
        this.playSound('drop');
    }

    // Здесь будут остальные методы игры
    // ...
}

// Создание экземпляра игры
const game = new ChristmasTetris(); 