const socket = io();

var cars = {};
var checkpoints = [];
var isCreatingCheckpoints = false;
var lapCount = 0;
var collectedCheckpoints = 0;
var currentCheckpointIndex = 0;
var myCar;
var redFiestaImg;
var yellowFiestaImg;
var backgroundImg;
var countdown = 0;
var countdownInterval;
var tireMarks = []; // Array to store tire marks

function preload() {
  redFiestaImg = loadImage('red-fiesta.png');
  yellowFiestaImg = loadImage('yellow-fiesta.png');
  backgroundImg = loadImage('racetrack-2.jpg')
}

document.getElementById('createCheckpoints').addEventListener('click', () => {
  document.getElementById('saveCheckpoints').style.display = 'block';
  document.getElementById('createCheckpoints').style.display = 'none';
  isCreatingCheckpoints = true;
  checkpoints = [];
});

document.getElementById('saveCheckpoints').addEventListener('click', () => {
  isCreatingCheckpoints = false;
  socket.emit('saveCheckpoints', checkpoints);
  document.getElementById('saveCheckpoints').style.display = 'none';
  document.getElementById('createCheckpoints').style.display = 'block';
});

document.getElementById('resetGame').addEventListener('click', () => {
  restartGame();
  socket.emit('restartGamePressed');
});

function restartGame() {
  if(myCar && checkpoints.length != 0)
    {
      myCar.d.x = checkpoints[0].x;
      myCar.d.y = checkpoints[0].y;
      setCarAngleToCheckpoint();
      lapCount = 0;
      startCountdown();
    }
}

function setup() {
  createCanvas(backgroundImg.width, backgroundImg.height);
  frameRate(60);
}

function sendCarData(car)
{
  return {
    x: car.d.x,
    y: car.d.y,
    angle: car.angle
  };
}

socket.on('restartGame', () => {
  restartGame();
});

socket.on('init', (data) => {
  myCar = new Car(data.init_loc.x, data.init_loc.y, data.init_loc.angle);
  myCarId = data.id;
  cars = data.cars;
  checkpoints = data.checkpoints;

  if(myCar && checkpoints.length != 0)
    {
      myCar.d.x = checkpoints[0].x;
      myCar.d.y = checkpoints[0].y;
      setCarAngleToCheckpoint();
    }

});

socket.on('newCar', (data) => {
  cars[data.id] = data.car;
});

socket.on('removeCar', (id) => {
  delete cars[id];
});

socket.on('updateCar', (data) => {
  if (data.id !== myCarId) { // Avoid overriding our own updates
    cars[data.id] = data.car;
  }
});

socket.on('checkpointsUpdated', (data) => {
  checkpoints = data;

  //move car to first checkpoint and change angle.
  if(myCar && checkpoints.length != 0)
    {
      myCar.d.x = checkpoints[0].x;
      myCar.d.y = checkpoints[0].y;
      setCarAngleToCheckpoint();
    }

    startCountdown();
});

function checkCheckpoints() {
  if (currentCheckpointIndex < checkpoints.length) {
    let checkpoint = checkpoints[currentCheckpointIndex];
    let d = dist(myCar.d.x, myCar.d.y, checkpoint.x, checkpoint.y);
    if (d < 40) {
      collectedCheckpoints++;
      currentCheckpointIndex++; // Move to the next checkpoint
      if (currentCheckpointIndex === checkpoints.length) {
        lapCount++;
        collectedCheckpoints = 0;
        currentCheckpointIndex = 0; // Reset for the next lap
        // socket.emit('lapCompleted');
      }
    }
  }
}

function moveClientCar() {
  if(!myCar) return;
  myCar.update();
  myCar.show();
  drawCar(myCar.d.x, myCar.d.y, myCar.angle);

  if (myCar.d.x > width) {
    myCar.d.x = width;
    myCar.v.x = 0;
  } else if (myCar.d.x < 0) {
    myCar.d.x = 0;
    myCar.v.x = 0;
  }
  if (myCar.d.y > height) {
    myCar.d.y = height;
    myCar.v.y = 0;
  } else if (myCar.d.y < 0) {
    myCar.d.y = 0;
    myCar.v.y = 0;
  }

  if (myCar.isDrifting) {
    tireMarks.push({ x: myCar.d.x, y: myCar.d.y, opacity: 255 });
  }

  socket.emit('moveCar', sendCarData(myCar));
}

function drawCar(x, y, angle, carImg = redFiestaImg) {
  imageMode(CENTER);
  push();
  translate(x, y);
  rotate(angle);
  image(carImg, 0, 0, 50, 50);
  pop();
}

function mousePressed() {
  if (isCreatingCheckpoints && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    checkpoints.push({ x: mouseX, y: mouseY });
  }
}

function displayCheckpoints() {
  stroke(0);
  fill(255, 0, 0);
  for (let i = 0; i < checkpoints.length; i++) {
    let checkpoint = checkpoints[i];
    if (i === currentCheckpointIndex) {
      fill(0, 255, 0); // Highlight the next checkpoint to collect
    } else {
      fill(255, 0, 0);
    }
    ellipse(checkpoint.x, checkpoint.y, 20, 20);
  }
}

function startCountdown() {
  myCar.controllable = false;
  myCar.v = createVector(0,0);
  countdown = 3;

  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown === 0) {
      clearInterval(countdownInterval);
      myCar.controllable = true;
    }
  }, 1000);
}

function displayCountdown() {
  if (countdown > 0) {
    textSize(64);
    fill(0);
    textAlign(CENTER, CENTER);
    text(countdown, width / 2, height / 2);
  }
}

function setCarAngleToCheckpoint() {
  if (checkpoints.length < 2) {
    return;
  }

  let checkpoint1 = checkpoints[0];
  let checkpoint2 = checkpoints[1];

  // Calculate the angle between checkpoint1 and checkpoint2
  let angle = atan2(checkpoint2.y - checkpoint1.y, checkpoint2.x - checkpoint1.x);

  // Convert angle to degrees if needed (p5.js uses radians by default)
  // let angleDegrees = degrees(angle);

  // Set the car's angle
  if (myCar) {
    myCar.angle = angle - 1.5708;
  }
}

function displayLapCount() {
  document.getElementById('lapCount').innerText = 'Laps: ' + lapCount;
}

function drawAndUpdateMarks()
{
  // Draw and update tire marks
  for (let i = tireMarks.length - 1; i >= 0; i--) {
    let mark = tireMarks[i];
    fill(50, mark.opacity);
    noStroke();
    ellipse(mark.x, mark.y, 10, 5);
    mark.opacity -= 1;
    if (mark.opacity <= 0) {
      tireMarks.splice(i, 1); // Remove mark when it's fully transparent
    }
  }
}

function draw() {
  imageMode(CORNER);
  background(backgroundImg);
  checkCheckpoints();
  displayLapCount();
  drawAndUpdateMarks();
  moveClientCar();
  Object.entries(cars).forEach(([key, car]) => {
    if (key == myCarId) return;
    drawCar(car.x, car.y, car.angle, yellowFiestaImg);
  });
  displayCheckpoints();
  displayCountdown();
}
