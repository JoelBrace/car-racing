const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

var cars = {}; // Store cars by socket.id
var checkpoints = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Initialize a car for each new connection
  cars[socket.id] = {
    x: 250, // You might want to randomize this
    y: 500, // You might want to randomize this
    angle: 0
  };

  // Send the current state to the new user
  socket.emit('init', { id: socket.id, init_loc: cars[socket.id], cars, checkpoints });

  // Update all users when a new car is added
  socket.broadcast.emit('newCar', { id: socket.id, car: cars[socket.id] });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete cars[socket.id];
    socket.broadcast.emit('removeCar', socket.id);
  });

  socket.on('saveCheckpoints', (data) => {
    checkpoints = data;
    io.emit('checkpointsUpdated', checkpoints);

    Object.entries(cars).forEach(([key, car]) => {
      socket.broadcast.emit('updateCar', { id: key, car: car });
    });
  });

  socket.on('moveCar', (data) => {
    if (cars[socket.id]) {
      cars[socket.id] = data;
      socket.broadcast.emit('updateCar', { id: socket.id, car: data });
    }
  });
});

const PORT = 25566;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
