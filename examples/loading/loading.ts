import { findFirst } from "../..";

const device = findFirst();

async function main() {
    if (device) {

        for (let i = 0; i < 3; i++) {

            await device.loading({
                delay: 1000
            });
        }
    }
}

main();