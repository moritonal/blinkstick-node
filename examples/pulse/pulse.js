var blinkstick = require('./../../blinkstick'),
    device = blinkstick.findFirst();

async function main() {
    if (device) {
        await device.pulse({ red: 255, duration: 1000 });
        await device.pulse({ green: 255, duration: 1000 });
        await device.pulse({ blue: 255, duration: 1000 });
        await device.pulse();
    }
}

main();