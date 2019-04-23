import { findFirst } from "../.."

const main = async function() {
    
    var device = findFirst();
    
    if (device) {
        
        await device.blink({ "red": 255, 'delay':20, 'repeats': 100 });
        await device.blink({'green': 255, 'delay':50, 'repeats': 10});
        await device.blink({"blue": 255, 'delay':25, 'repeats': 20});
    }
}

main();