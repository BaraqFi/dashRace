const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
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
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

let car;
let lanes;
let coins;
let score = 0;
let scoreText;
let mileText;
let miles = 0;
let currentLaneIndex;
let isPaused = false;
let speed = 100;
let pauseButton;
let restartButton;
let previousCoinLane;
const maxCoins = 7;

function preload() {
    this.load.image('car', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmcGRCqD3eiEmbb59NSTTRBZdcqSsZyYwmT1yyQGDpGgnL');
    this.load.image('coin', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmVkZ3kdFCdqDCLAnpALb36GsNgXoTMh2wjqY53t2V7Hg6');;
    this.load.image('road', 'https://labs.phaser.io/assets/sprites/road.png');
    this.load.image('line', 'https://labs.phaser.io/assets/sprites/line.png');
}

function create() {
    lanes = [this.cameras.main.width / 4, this.cameras.main.width / 2, 3 * this.cameras.main.width / 4]; // Three vertical lane positions

    // Create road backgrounds
    for (let lane of lanes) {
        this.add.rectangle(lane, this.cameras.main.height / 2, this.cameras.main.width / 3.5, this.cameras.main.height, 0x333333).setOrigin(0.5, 0.5); // road color
        for (let i = 0; i < 10; i++) {
            this.add.rectangle(lane, i * (this.cameras.main.height / 10), 10, this.cameras.main.height / 20, 0xFFFFFF).setOrigin(0.5, 0.5); // lane lines
        }
    }

    currentLaneIndex = 1; // Start in the center lane
    car = this.physics.add.sprite(lanes[currentLaneIndex], this.cameras.main.height - 100, 'car');
    car.setCollideWorldBounds(true);
    car.setScale(2.3);
    car.angle = 0; // Rotate car to face upwards

    coins = this.physics.add.group({
        key: 'coin',
        repeat: 3, // Initial coins
        setXY: { x: lanes[Phaser.Math.Between(0, 2)], y: 0, stepX: this.cameras.main.width / 4 }
    });

    coins.children.iterate(function (coin) {
        coin.setVelocityY(speed);
        coin.setScale(2.2);
    });

    this.physics.add.overlap(car, coins, collectCoin, null, this);

    scoreText = this.add.text(16, 50, 'Score: 0', { fontSize: '25px', fill: '#FFFFFF' }); // Adjusted y-coordinate to 50
    mileText = this.add.text(16, 90, 'Miles: 0', { fontSize: '25px', fill: '#FFFFFF' }); // Adjusted y-coordinate to 90

    this.input.on('pointerdown', moveCar, this);

    // Add a timed event to spawn coins continuously
    this.time.addEvent({
        delay: 1000, // every 1 second
        callback: spawnCoin,
        callbackScope: this,
        loop: true
    });

    // Add a timed event to update miles continuously
    this.time.addEvent({
        delay: 3000, // every 1 second
        callback: updateMiles,
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
    /* restartButton = document.getElementById('restartButton');
    restartButton.addEventListener('click', () => {
        this.scene.restart();
        score = 0;
        miles = 0;
        speed = 100;
        isPaused = false;
        pauseButton.textContent = 'Pause';
    }); */

    this.scale.on('resize', resize, this);
}

function update() {
    if (!isPaused) {
        coins.children.iterate(function (coin) {
            if (coin.y > game.config.height) {
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
        coin.setScale(2.2);
    }
}

function collectCoin(car, coin) {
    coin.disableBody(true, true);

    score += 10;
    scoreText.setText('Score: ' + score);

    // Spawn a new coin to replace the collected one
    spawnCoin();
}

function updateMiles() {
    if (!isPaused) {
        miles++;
        mileText.setText('Miles: ' + miles);
    }
}

function resize(gameSize, baseSize, displaySize, resolution) {
    let width = gameSize.width;
    let height = gameSize.height;

    if (width === undefined) {
        width = this.sys.game.config.width;
    }
    if (height === undefined) {
        height = this.sys.game.config.height;
    }

    this.cameras.resize(width, height);
    lanes = [width / 4, width / 2, 3 * width / 4];
    car.setPosition(lanes[currentLaneIndex], height - 100);
}

