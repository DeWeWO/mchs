const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:5000/api/sensor-data';

const mockData = {
    alarm: false,
    fire: false,
    quake: false,
    lpg: 0.45,
    gas: 0.32,
    co: 0.12,
    temp: 24.5
};

// Simulate a fire alarm after 5 seconds
setTimeout(() => {
    console.log("Sending FIRE ALARM...");
    sendData({ ...mockData, fire: true, alarm: true, temp: 45.2 });
}, 5000);

// Initial Normal Data
console.log("Sending Normal Data...");
sendData(mockData);

async function sendData(payload) {
    try {
        const res = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`Status: ${res.status} - ${await res.text()}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
