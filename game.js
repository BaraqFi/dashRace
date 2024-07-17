const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let car;
let lanes;
let coins;
let score = 0;
let scoreText;
let currentLaneIndex;
let isPaused = false;
let speed = 150;
let pauseButton;
let restartButton;
let previousCoinLane;
const maxCoins = 6;

function preload() {
    this.load.image('car', 'https://labs.phaser.io/assets/sprites/car90.png');
    this.load.image('coin', 'https://labs.phaser.io/assets/sprites/gold_1.png');
    this.load.image('road', 'https://labs.phaser.io/assets/sprites/road.png');
    this.load.image('line', 'https://labs.phaser.io/assets/sprites/line.png');
}

function create() {
    lanes = [200, 400, 600]; // Three vertical lane positions

    // Create road backgrounds
    for (let lane of lanes) {
        this.add.rectangle(lane, 300, 150, 600, 0x333333).setOrigin(0.5, 0.5); // road color
        for (let i = 0; i < 10; i++) {
            this.add.rectangle(lane, i * 60, 10, 30, 0xFFFFFF).setOrigin(0.5, 0.5); // lane lines
        }
    }

    currentLaneIndex = 1; // Start in the center lane
    car = this.physics.add.sprite(lanes[currentLaneIndex], 500, 'car');
    car.setCollideWorldBounds(true);
    car.angle = -90; // Rotate car to face upwards

    coins = this.physics.add.group({
        key: 'coin',
        repeat: 3, // Initial coins
        setXY: { x: lanes[Phaser.Math.Between(0, 2)], y: 0, stepX: 150 }
    });

    coins.children.iterate(function (coin) {
        coin.setVelocityY(speed);
    });

    this.physics.add.overlap(car, coins, collectCoin, null, this);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#FFFFFF' });

    this.input.on('pointerdown', moveCar, this);

    // Add a timed event to spawn coins continuously
    this.time.addEvent({
        delay: 1000, // every 1 second
        callback: spawnCoin,
        callbackScope: this,
        loop: true
    });

    // Pause button logic
    pauseButton = document.getElementById('pauseButton');
    pauseButton.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
            this.physics.pause();
            pauseButton.textContent = 'Play';
        } else {
            this.physics.resume();
            pauseButton.textContent = 'Pause';
        }
    });

    // Restart button logic
    restartButton = document.getElementById('restartButton');
    restartButton.addEventListener('click', () => {
        this.scene.restart();
        score = 0;
        speed = 100;
        isPaused = false;
        pauseButton.textContent = 'Pause';
    });
}

function update() {
    if (!isPaused) {
        coins.children.iterate(function (coin) {
            if (coin.y > 600) {
                coin.y = 0;
                coin.x = lanes[Phaser.Math.Between(0, 2)];
            }
        });

        // Increase speed progressively
        speed += 0.01;
        coins.setVelocityY(speed);
    }
}

function moveCar(pointer) {
    if (pointer.x < car.x && currentLaneIndex > 0) {
        currentLaneIndex--;
    } else if (pointer.x > car.x && currentLaneIndex < 2) {
        currentLaneIndex++;
    }
    car.x = lanes[currentLaneIndex];
}

function spawnCoin() {
    if (!isPaused && coins.countActive(true) < maxCoins) {
        let newLane;
        do {
            newLane = Phaser.Math.Between(0, 2);
        } while (newLane === previousCoinLane);
        previousCoinLane = newLane;

        const coin = coins.create(lanes[newLane], 0, 'coin');
        coin.setVelocityY(speed);
    }
}

function collectCoin(car, coin) {
    coin.disableBody(true, true);

    score += 10;
    scoreText.setText('Score: ' + score);

    // Spawn a new coin to replace the collected one
    spawnCoin();
}
