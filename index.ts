import * as usb from "usb";
import { BlinkStick } from "./src/BlinkStick";

const VENDOR_ID = 0x20a0;
const PRODUCT_ID = 0x41e5;

/**
 * Find BlinkSticks using a filter.
 */
function findBlinkSticks(filter?: (device: usb.Device) => boolean) {

    if (filter === undefined)
        filter = () => {
            return true;
        };

    let devices = usb.getDeviceList();

    const validDevices = devices.filter(device =>
        device.deviceDescriptor.idVendor === VENDOR_ID &&
        device.deviceDescriptor.idProduct === PRODUCT_ID &&
        filter(device));

    return validDevices.map(device =>
        new BlinkStick(
            device,
            device.deviceDescriptor.iSerialNumber,
            device.deviceDescriptor.iManufacturer,
            device.deviceDescriptor.idProduct));
}

/**
 * Find first attached BlinkStick.
 */
export function findFirst(): BlinkStick {

    var devices = findBlinkSticks();

    return devices.length > 0 ? devices[0] : null;
};

/**
 * Find all attached BlinkStick devices.
 */
export function findAll(): Array<BlinkStick> {
    return findBlinkSticks();
};

/**
 * Find BlinkStick device based on serial number.
 */
export async function findBySerial(targetSerial: string): Promise<BlinkStick | null> {

    var devices = findBlinkSticks();

    for (const device of devices) {

        const serial = await new Promise((res, rej) => {
            device.getSerial(function (err, serialNumber) {
                if (err)
                    rej(err);
                else
                    res(serialNumber);
            });
        });

        if (serial == targetSerial)
            return device;
    }

    return null;
};