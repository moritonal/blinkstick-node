import delay from "delay";
import retry from "retry";
import { IOptions } from "./IOptions";
import { IColour } from "./IColour";
import { IPulseOptions } from "./IPulseOptions";

import * as usb from "usb";
import * as HID from "node-hid";

export class BlinkStick {

    hidDevice: HID.HID;
    device: usb.Device;
    inverse: boolean;
    manufacturer: string;
    product: string;
    animationsEnabled: boolean;
    requiresSoftwareColorPatch: boolean;
    serial: string;

    constructor(device, serialNumber?, manufacturer?, product?) {

        if (device) {

            this.hidDevice = new HID.HID(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct);
            device.open();

            this.device = device;
            this.manufacturer = manufacturer;
            this.product = product;
        } else {
            throw "No device provided";
        }

        this.inverse = false;
        this.animationsEnabled = true;

        this.getSerial((err, result) => {

            if (typeof (err) === 'undefined') {

                this.requiresSoftwareColorPatch = 
                    this.getVersionMajor() == 1 &&
                    this.getVersionMinor() >= 1 &&
                    this.getVersionMinor() <= 3;
            }
        });
    }

    /**
     * Returns the serial number of device.
     *
     * <pre>
     * BSnnnnnn-1.0
     * ||  |    | |- Software minor version
     * ||  |    |--- Software major version
     * ||  |-------- Denotes sequential number
     * ||----------- Denotes BlinkStick device
     * </pre>
     *
     * Software version defines the capabilities of the device
     *
     * Usage:
     *
     * @example
     *     getSerial(function(err, serial) {
    *         console.log(serial);
    *     });
    *
    * @method getSerial
    * @param {function} callback Callback to receive serial number
    */
    getSerial(callback: (err: any, serial: string) => void) {

        this.device.getStringDescriptor(this.device.deviceDescriptor.iSerialNumber, (err, buf) => {

            if (err == null) {

                const result = buf.toString('utf8');
                this.serial = result;

                if (callback)
                    callback(err, result);
            }
            else {
                throw err;
            }
        });
    }

    /**
     * Close BlinkStick device and stop all animations
     */
    close(callback: (ex?) => void) {
        this.stop();
        try {
            this.device.close();
        }
        catch (ex) {
            if (callback)
                callback(ex);
            return;
        }
        if (callback)
            callback();
    }

    /**
     * Stop all animations
     */
    stop() {
        this.animationsEnabled = false;
    }

    /**
     * Get the major version from serial number
     */
    getVersionMajor() {
        return parseInt(this.serial.substring(this.serial.length - 3, this.serial.length - 2));
    }

    /**
     * Get the minor version from serial number
     */
    getVersionMinor() {
        return parseInt(this.serial.substring(this.serial.length - 1, this.serial.length));
    }


    /**
     * Get the manufacturer of the device
     *
     * Usage:
     *
     * @example
     *     getManufacturer(function(err, data) {
     *         console.log(data);
     *     });
     *
     * @method getManufacturer
     * @param {function} callback Callback to receive manufacturer name
     */
    getManufacturer(callback) {

        this.device.getStringDescriptor(this.device.deviceDescriptor.iManufacturer, function (err, result) {
            if (callback)
                callback(err, result);
        });
    }

    /**
     * Get the description of the device
     *
     * Usage:
     *
     * @example
     *     getDescription(function(err, data) {
     *         console.log(data);
     *     });
     *
     * @method getDescription
     * @param {function} callback Callback to receive description
    */
    getDescription(callback) {

        this.device.getStringDescriptor(2, function (err, result) {
            if (callback)
                callback(err, result);
        });
    }

    /**
     * Set inverse mode for IKEA DIODER in conjunction with BlinkStick v1.0
     *
     * @method setInverse
     * @param {Boolean} inverse Set true for inverse mode and false otherwise
     */
    setInverse(inverse) {
        this.inverse = inverse;
    }

    /**
     * Get inverse mode setting for IKEA DIODER in conjunction with BlinkStick v1.0
     *
     * @method getInverse
     * @return {Boolean} true for enabled inverse mode and false otherwise
     */
    getInverse(inverse) {
        return this.inverse;
    }

    /**
     * Set mode for BlinkStick Pro
     *
     * - 0 = Normal
     * - 1 = Inverse
     * - 2 = WS2812
     *
     * You can read more about BlinkStick modes by following this link:
     *
     * http://www.blinkstick.com/help/tutorials/blinkstick-pro-modes
     *
     * @method setMode
     * @param {Number} mode Set the desired mode for BlinkStick Pro
     */
    async setMode(mode) {
        await this.setFeatureReport([4, mode]);
    }

    /**
     * Get mode for BlinkStick Pro
     *
     * - 0 = Normal
     * - 1 = Inverse
     * - 2 = WS2812
     *
     * You can read more about BlinkStick modes by following this link:
     *
     * http://www.blinkstick.com/help/tutorials/blinkstick-pro-modes
     *
     * Usage:
     *
     * @example
     *     getMode(function(err, data) {
     *         console.log(data);
     *     });
     *
     * @method getMode
     * @param {callback} callback receive mode with callback
     */
    getMode(callback) {
        try {
            this.getFeatureReport(4, 33, function (err, buffer) {
                if (callback)
                    callback(err, buffer[1]);
            });
        }
        catch (err) {
            if (callback)
                callback(err, 0);
        }
    }



    /**
     * Get the current color as hex string.
     *
     * Function supports the following overloads:
     *
     * @example
     *     //Available overloads
     *     getColorString(callback); //index defaults to 0
     *
     *     getColorString(index, callback);
     *
     * @example
     *     getColorString(0, function(err, color) {
     *         console.log(color);
     *     });
     *
     *     getColorString(function(err, color) {
     *         console.log(color);
     *     });
     *
     * @method getColorString
     * @param {Number} index The index of the LED to retrieve data
     * @param {Function} callback Callback to which to pass the color string.
     * @return {String} Hex string, eg "#BADA55".
     */
    async getColorString(index) {
        if (typeof (index) == 'function') {
            index = 0;
        }
        let colour = await this.getColor(index);
        return '#' +
            this.decimalToHex(colour.red, 2) +
            this.decimalToHex(colour.green, 2) +
            this.decimalToHex(colour.blue, 2);
    }

    decimalToHex(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }

    /**
     * Sets the LED to a random color.
     *
     * @method setRandomColor
     */
    async setRandomColor(): Promise<void> {

        await this.setColor(
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256)
        );
    }

    /**
     * Turns the LED off.
     *
     * @method turnOff
     */
    async turnOff(): Promise<void> {
        await this.setColor();
    }

    /**
     * Blinks specified RGB color.
     *
     * Function supports the following overloads:
     *
     * @example
     *     //Available overloads
     *     blink(red, green, blue, [options], [callback]); // use [0..255] ranges for intensity
     *
     *     blink(color, [options], [callback]); // use '#rrggbb' format
     *
     *     blink(color_name, [options], [callback]); // use 'random', 'red', 'green', 'yellow' and other CSS supported names
     *
     * Options can contain the following parameters for object:
     *
     * - channel=0: Channel is represented as 0=R, 1=G, 2=B
     * - index=0: The index of the LED
     * - repeats=1: How many times to blink
     * - delay=1: Delay between on/off cycles in milliseconds
     *
     * @method blink
     */
    async blink(options: IOptions): Promise<void> {

        options.channel = options.channel | 0;
        options.index = options.index | 0;
        options.repeats = options.repeats | 1;
        options.delay = options.delay | 0;
        for (let i = 0; i < options.repeats; i++) {
            await this.setColor(options.red | 0, options.green | 0, options.blue | 0, options);
            await delay(options.delay);
            await this.setColor(0, 0, 0, options);
        }
    }

    _determineReportId(ledCount) {
        var reportId = 9;
        var maxLeds = 64;
    
        if (ledCount < 8 * 3) {
            reportId = 6;
            maxLeds = 8;
        } else if (ledCount < 16 * 3) {
            reportId = 7;
            maxLeds = 16;
        } else if (ledCount < 32 * 3) {
            reportId = 8;
            maxLeds = 32;
        }
    
        return { 'reportId': reportId, 'maxLeds': maxLeds };
    }

    /**
     * Morphs to specified RGB color from current color.
     *
     * Function supports the following overloads:
     *
     * @example
     *     //Available overloads
     *     morph(red, green, blue, [options], [callback]); // use [0..255] ranges for intensity
     *
     *     morph(color, [options], [callback]); // use '#rrggbb' format
     *
     *     morph(color_name, [options], [callback]); // use 'random', 'red', 'green', 'yellow' and other CSS supported names
     *
     * Options can contain the following parameters for object:
     *
     * - channel=0: Channel is represented as 0=R, 1=G, 2=B
     * - index=0: The index of the LED
     * - duration=1000: How long should the morph animation last in milliseconds
     * - steps=50: How many steps for color changes
     *
     * @method morph
     * @param {Number|String} red Red color intensity 0 is off, 255 is full red intensity OR string CSS color keyword OR hex color, eg "#BADA55".
     * @param {Number} [green] Green color intensity 0 is off, 255 is full green intensity.
     * @param {Number} [blue] Blue color intensity 0 is off, 255 is full blue intensity.
     * @param {Object}   [options] additional options {"channel": 0, "index": 0, "duration": 1000, "steps": 50}
     * @param {Function} [callback] Callback when the operation completes
     */
    async morph(options: {
        red?: number;
        green?: number;
        blue?: number;
        channel?: number;
        index?: number;
        duration?: number;
        steps?: number;
    }) {

        options.channel = options.channel || 0;
        options.index = options.index || 0;
        options.duration = options.duration || 1000;
        options.steps = options.steps || 255;

        let colour = await this.getColor(options.index);

        for (let i = 0; i < options.steps; i++) {
            let r = colour.red + (options.red - colour.red) / options.steps * i;
            let g = colour.green + (options.green - colour.green) / options.steps * i;
            let b = colour.blue + (options.blue - colour.blue) / options.steps * i;
            var nextRed = parseInt(r.toString());
            let nextGreen = parseInt(g.toString());
            let nextBlue = parseInt(b.toString());
            await this.setColor(nextRed, nextGreen, nextBlue, options);
            await delay(parseInt((options.duration / options.steps).toString()));
        }
    }

    /**
     * Pulses specified RGB color.
     *
     * Function supports the following overloads:
     *
     * @example
     *     //Available overloads
     *     pulse(red, green, blue, [options], [callback]); // use [0..255] ranges for intensity
     *
     *     pulse(color, [options], [callback]); // use '#rrggbb' format
     *
     *     pulse(color_name, [options], [callback]); // use 'random', 'red', 'green', 'yellow' and other CSS supported names
     *
     * Options can contain the following parameters for object:
     *
     * - channel=0: Channel is represented as 0=R, 1=G, 2=B
     * - index=0: The index of the LED
     * - duration=1000: How long should the pulse animation last in milliseconds
     * - steps=50: How many steps for color changes
     *
     * @method pulse
     * @param {Object} red Red color intensity 0 is off, 255 is full red intensity OR string CSS color keyword OR hex color, eg "#BADA55".
     * @param {Number} [green] Green color intensity 0 is off, 255 is full green intensity.
     * @param {Number} [blue] Blue color intensity 0 is off, 255 is full blue intensity.
     * @param {Object}   [options] additional options {"channel": 0, "index": 0, "duration": 1000, "steps": 50}
     * @param {Function} [callback] Callback when the operation completes
     */
    async pulse(options?: IPulseOptions) {
        if (options == null)
            options = {};
        options.channel = options.channel | 0;
        options.duration = options.duration || 1000;
        options.index = options.index | 0;
        options.steps = options.steps | Math.min(options.duration, 255);
        options.red = options.red | 0;
        options.green = options.green | 0;
        options.blue = options.blue | 0;
        try {
            await this.morph({
                red: options.red,
                blue: options.blue,
                green: options.green,
                channel: options.channel,
                duration: options.duration,
                steps: options.steps
            });
        }
        catch (err) {
            await this.morph({
                red: 0,
                green: 0,
                blue: 0
            });
            throw err;
        }
    }

    /**
    * Set feature report to the device.
    *
    * @method setFeatureReport
    * @param {Number} reportId Report ID to receive
    * @param {Array} data Data to send to the device
    * @param {Function} callback Function called when report sent
    */
    async setFeatureReport(data: Array<number>) {
        let op = retry.operation();
        op.attempt(() => {
            try {
                this.hidDevice.sendFeatureReport(data);
            }
            catch (err) {
                console.log("Failed to send, retrying");
                op.retry(err);
            }
        });
    }

    /**
    * Get feature report from the device.
    *
    * @method getFeatureReport
    * @param {Number} reportId Report ID to receive
    * @param {Number} length Expected length of the report
    * @param {Function} callback Function called when report received
    */
    getFeatureReport(reportId, length, callback: (err: string, buffer?: number[]) => void) {
        var retries = 0;
        var error;
        var self = this;

        var retryTransfer = function () {
            retries = retries + 1;
            if (retries > 5) {
                if (callback)
                    callback(error);
                return;
            }
            try {
                var buffer = self.hidDevice.getFeatureReport(reportId, length);

                if (callback)
                    callback(undefined, buffer);
            }
            catch (ex) {
                if (typeof (error) === 'undefined') {
                    //Store only the first error
                    error = ex;
                }
                retryTransfer();
            }
        };

        retryTransfer();
    }

    /**
     * Get the current color visible on BlinkStick
     *
     * Function supports the following overloads:
     *
     * @example
     *     //Available overloads
     *     getColor(callback); //index defaults to 0
     *
     *     getColor(index, callback);
     *
     * @example
     *     getColor(0, function(err, r, g, b) {
     *         console.log(r, g, b);
     *     });
     *
     * @method getColor
     * @param {Number=0} index The index of the LED
     * @param {Function} callback Callback to which to pass the color values.
     * @return {Number, Number, Number} Callback returns three numbers: R, G and B [0..255].
     */
    getColor(index): Promise<IColour> {
        return new Promise((res, rej) => {
            this.getFeatureReport(0x0001, 33, function (err, buffer) {
                if (typeof (err) === 'undefined') {
                    if (buffer) {
                        res({
                            red: buffer[1],
                            green: buffer[2],
                            blue: buffer[3]
                        });
                    }
                    else {
                        rej(err);
                    }
                }
                else {
                    rej(err);
                }
            });
        });
    }

    /**
     * Set the color frame on BlinkStick Pro
     *
     * @example
     *     var data = [255, 0, 0, 0, 255, 0];
     *
     *     setColors(0, data, function(err) {
     *     });
     *
     * @method setColors
     * @param {Number} channel Channel is represented as 0=R, 1=G, 2=B
     * @param {Array} data LED data in the following format: [g0, r0, b0, g1, r1, b1...]
     * @param {Function} callback Callback when the operation completes
     */
    async setColors(channel : number, data : number[], callback) {
        let params = this._determineReportId(data.length);
        var i = 0;
        let report = [params.reportId, channel];
        data.forEach(function (item) {
            if (i < params.maxLeds * 3) {
                report.push(item);
                i += 1;
            }
        });
        for (var j = i; j < params.maxLeds * 3; j++) {
            report.push(0);
        }
        await this.setFeatureReport(report);
    }

    /**
     * Set the color of LEDs
     */
    async setColor(red?: number, green?: number, blue?: number, options?: IOptions): Promise<void> {
        
        if (red == undefined)
            red = 0;
        if (green == undefined)
            green = 0;
        if (blue == undefined)
            blue = 0;

        if (typeof (options) === 'undefined') {
            options = {
                channel: 0,
                index: 0
            };
        }
        
        if (options.channel === 0 && options.index === 0) {
            
            await this.setFeatureReport([1, red, green, blue]);
        }
        else {
            await this.setFeatureReport([5, options.channel, options.index, red, green, blue]);
        }
    }
}
