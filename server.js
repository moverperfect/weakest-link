const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

const scoringTable = {
  1: [50, 100, 250, 500, 750, 1000, 1500, 2500],
  2: [50, 100, 250, 500, 750, 1000, 1500, 2500],
  3: [100, 250, 500, 750, 1000, 1500, 2500, 5000],
  4: [100, 250, 500, 750, 1000, 1500, 2500, 5000],
  5: [250, 500, 1000, 1500, 2000, 3000, 5000, 7500],
  6: [250, 500, 1000, 1500, 2000, 3000, 5000, 7500],
  7: [250, 500, 1000, 1500, 2500, 5000, 7500, 10000],
};

let currentRound = '1';
let consecutiveCorrect = 0;

let totalBanked = 0;
let adminClient = null;

wss.on('connection', (ws) => {
  if (!adminClient) {
    adminClient = ws;
    ws.send(
      JSON.stringify({
        type: 'admin',
        totalBanked: totalBanked,
        currentRound: currentRound,
      })
    );
    console.log('Admin connected');
  }

  ws.on('message', (message) => {
    const { action, value } = JSON.parse(message);

    if (ws === adminClient) {
      switch (action) {
        case 'set_round':
          currentRound = value;
          totalBanked = 0;
          consecutiveCorrect = 0;
          broadcastGameState();
          break;
        case 'reset_game':
          totalBanked = 0;
          consecutiveCorrect = 0;
          broadcastGameState();
          break;
      }
    }

    switch (action) {
      case 'correct':
        consecutiveCorrect++;
        break;
      case 'incorrect':
        totalUnreliable = 0;
        consecutiveCorrect = 0;
        break;
      case 'bank':
        totalBanked += scoringTable[currentRound][consecutiveCorrect - 1] || 0;
        consecutiveCorrect = 0;
        break;
    }

    broadcastGameState();
  });

  ws.on('close', () => {
    if (ws === adminClient) {
      adminClient = null;
      console.log('Admin disconnected');
    }
  });

  function broadcastGameState() {
    const state = {
      totalBanked,
      currentRound,
    };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(state));
      }
    });
  }
});
