import { findFirst } from "./../../blinkstick"

const device = findFirst();

if (!device) 
    throw "No Device";

async function main() {

    await device.morph({ red: 255 });

    await device.morph({ blue: 255 });

            /*device.morph('green', function () {
                device.morph('blue', function () {
                    finished = true;
                });
            });
        });
}*/
}

main();