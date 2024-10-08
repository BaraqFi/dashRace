if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();  // Indicate that the web app is ready
    tg.expand(); // Request to expand the mini app to full size
}

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
let obstacles;
let missiles;
let score = 0;
let scoreText;
let mileText;
let miles = 0;
let level = 1;
let levelText;
let currentLaneIndex;
let isPaused = false;
let speed = 70;
let obstacleSpeed = 100;
let missileSpeed = 290;
let pauseButton;
let restartButton;
let previousCoinLane;
let previousObstacleLane;
const maxCoins = 7;
const maxObstacles = 3;
const maxMissiles = 1;
const levelThresholds = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500]; // Levels based on miles

function preload() {
    this.load.image('car', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmdU36cFQvdmpzuQ8aPVc8ehk35mNoVJqccMTqDAvQj8ZP');
    this.load.image('coin', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmVkZ3kdFCdqDCLAnpALb36GsNgXoTMh2wjqY53t2V7Hg6');
    this.load.image('road', 'https://labs.phaser.io/assets/sprites/road.png');
    this.load.image('line', 'https://labs.phaser.io/assets/sprites/line.png');
    this.load.image('obstacle', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmQMbdhVunxZ58Fdk4cZUEqEuW927baGMAzZvN3szsk1u5');
    this.load.image('missile', 'https://amethyst-near-cobra-868.mypinata.cloud/ipfs/QmT23AdgtfuCEbQ7cGmxfPLHdvcDALG3QKPPobzsoh8pTy'); // Example missile image
}

function create() {
    lanes = [this.cameras.main.width / 4, this.cameras.main.width / 2, 3 * this.cameras.main.width / 4];

    for (let lane of lanes) {
        this.add.rectangle(lane, this.cameras.main.height / 2, this.cameras.main.width / 3.5, this.cameras.main.height, 0x333333).setOrigin(0.5, 0.5);
        for (let i = 0; i < 10; i++) {
            this.add.rectangle(lane, i * (this.cameras.main.height / 10), 10, this.cameras.main.height / 20, 0xFFFFFF).setOrigin(0.5, 0.5);
        }
    }

    currentLaneIndex = 1;
    car = this.physics.add.sprite(lanes[currentLaneIndex], this.cameras.main.height - 100, 'car');
    car.setCollideWorldBounds(true);
    car.setScale(0.18);
    car.angle = 0;

    coins = this.physics.add.group({
        key: 'coin',
        repeat: 3,
        setXY: { x: lanes[Phaser.Math.Between(0, 2)], y: 0, stepX: this.cameras.main.width / 4 }
    });

    coins.children.iterate(function (coin) {
        coin.setVelocityY(speed);
        coin.setScale(1.5);
    });

    this.physics.add.overlap(car, coins, collectCoin, null, this);

    obstacles = this.physics.add.group();
    this.physics.add.overlap(car, obstacles, hitObstacle, null, this);

    missiles = this.physics.add.group();
    this.physics.add.overlap(car, missiles, hitMissile, null, this);

    scoreText = this.add.text(16, 50, 'Score: 0', { fontSize: '25px', fill: '#FFFFFF' });
    mileText = this.add.text(16, 90, 'Miles: 0', { fontSize: '25px', fill: '#FFFFFF' });
    levelText = this.add.text(16, 130, 'Level: 1', { fontSize: '25px', fill: '#FFFFFF' });

    this.input.on('pointerdown', moveCar, this);

    this.time.addEvent({
        delay: 1000,
        callback: spawnCoin,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 5000,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 3000,
        callback: updateMiles,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 25000,
        callback: spawnMissile,
        callbackScope: this,
        loop: true
    });

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

        obstacles.children.iterate(function (obstacle) {
            if (obstacle.y > game.config.height) {
                obstacle.y = 0;
                obstacle.x = lanes[Phaser.Math.Between(0, 2)];
            }
        });

        missiles.children.iterate(function (missile) {
            if (missile.y > game.config.height) {
                missile.destroy();
            }
        });

        speed += 0.02;
        obstacleSpeed += 0.02;
        coins.setVelocityY(speed);
        obstacles.setVelocityY(obstacleSpeed);
        missiles.setVelocityY(missileSpeed);
    }
}

function moveCar(pointer) {
    if (!isPaused && pointer.x < car.x && currentLaneIndex > 0) {
        currentLaneIndex--;
    } else if (pointer.x > car.x && currentLaneIndex < 2) {
        currentLaneIndex++;
    }
    car.x = lanes[currentLaneIndex];
}

function isOverlapping(group, x, y) {
    let overlapping = false;
    group.children.iterate(function (child) {
        if (child.active && Phaser.Math.Distance.Between(child.x, child.y, x, y) < 100) { // Adjust the distance as needed
            overlapping = true;
        }
    });
    return overlapping;
}

function spawnCoin() {
    if (!isPaused && coins.countActive(true) < maxCoins) {
        let newLane;
        let attempts = 0;
        do {
            newLane = Phaser.Math.Between(0, 2);
            attempts++;
        } while ((newLane === previousCoinLane || isOverlapping(coins, lanes[newLane], 0)) && attempts < 10);
        previousCoinLane = newLane;

        if (attempts < 10) { // Only spawn if no overlap after a reasonable number of attempts
            const coin = coins.create(lanes[newLane], 0, 'coin');
            coin.setVelocityY(speed);
            coin.setScale(1.5);
        }
    }
}

function spawnObstacle() {
    if (!isPaused && obstacles.countActive(true) < maxObstacles) {
        let newLane;
        let attempts = 0;
        do {
            newLane = Phaser.Math.Between(0, 2);
            attempts++;
        } while ((newLane === previousObstacleLane || isOverlapping(obstacles, lanes[newLane], 0)) && attempts < 10);
        previousObstacleLane = newLane;

        if (attempts < 10) { // Only spawn if no overlap after a reasonable number of attempts
            const obstacle = obstacles.create(lanes[newLane], 0, 'obstacle');
            obstacle.setVelocityY(obstacleSpeed);
            obstacle.setScale(0.7);
        }
    }
}

function spawnMissile() {
    if (!isPaused && missiles.countActive(true) < maxMissiles) {
        let newLane;
        let attempts = 0;
        do {
            newLane = Phaser.Math.Between(0, 2);
            attempts++;
        } while (isOverlapping(missiles, lanes[newLane], 0) && attempts < 10);

        if (attempts < 10) { // Only spawn if no overlap after a reasonable number of attempts
            const missile = missiles.create(lanes[newLane], 0, 'missile');
            missile.setVelocityY(missileSpeed);
            missile.setScale(0.2);
            missile.angle = 180;
        }
    }
}

function collectCoin(car, coin) {
    coin.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);
}

function hitObstacle(car, obstacle) {
    obstacle.disableBody(true, true);
    score -= 30;
    if (score < 0) {
        score = 0;
    }
    scoreText.setText('Score: ' + score);
}

function hitMissile(car, missile) {
    missile.disableBody(true, true);
    score -= 60;
    if (score < 0) {
        score = 0;
    }
    scoreText.setText('Score: ' + score);
}

function updateMiles() {
    if (!isPaused) {
        miles += 1;
        mileText.setText('Miles: ' + miles);

        if (level < levelThresholds.length && miles >= levelThresholds[level - 1]) {
            level++;
            levelText.setText('Level: ' + level);
            speed += 20;
            obstacleSpeed += 10;
            missileSpeed += 20;
        }
    }
}

function resize(gameSize, baseSize, displaySize, resolution) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (width === undefined) { return; }

    game.scale.resize(width, height);

    coins.children.iterate(function (coin) {
        coin.y = (coin.y / baseSize.height) * height;
        coin.x = lanes[Phaser.Math.Between(0, 2)];
    });

    obstacles.children.iterate(function (obstacle) {
        obstacle.y = (obstacle.y / baseSize.height) * height;
        obstacle.x = lanes[Phaser.Math.Between(0, 2)];
    });

    missiles.children.iterate(function (missile) {
        missile.y = (missile.y / baseSize.height) * height;
        missile.x = lanes[Phaser.Math.Between(0, 2)];
    });

    car.y = (car.y / baseSize.height) * height;
    car.x = lanes[currentLaneIndex];
}
