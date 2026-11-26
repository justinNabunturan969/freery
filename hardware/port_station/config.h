/*
 * Freery — settings for the port station.
 *
 * Every pin and every radio setting lives here, so nothing else has to be
 * changed when a board is wired differently.
 *
 * The radio settings below MUST be identical on the ferry unit and on the
 * port station. If they differ, the two boards never hear each other.
 *
 * The frequency is inside the band that is open to short range devices and
 * telemetry in the Philippines. NTC Memorandum Circular 01-02-2020 (which
 * amends MC 03-05-2007) lists 433.050 to 434.790 MHz at 10 mW ERP, and
 * NTC Memorandum Circular 04-08-2015 puts telemetry on 433.0 to 434.0 MHz
 * simplex. 433.500 MHz sits in the middle of both, with room for the
 * 125 kHz channel on either side. Confirm the channel with the NTC or with
 * the adviser before the units are deployed, and change LORA_FREQ on BOTH
 * units together if it moves.
 */

#ifndef FREERY_CONFIG_H
#define FREERY_CONFIG_H

/* --- LoRa (RA-02 / SX1278), identical on both units --------------------- */
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2
#define LORA_FREQ 433500000L /* 433.500 MHz - inside the band the NTC allows */
#define LORA_SF 7 /* spreading factor */
#define LORA_BW 125000L /* bandwidth */
#define LORA_CR 4 /* coding rate 4/8; the radio is told the denominator (CR + 4) */
#define LORA_SYNC 0x12 /* private sync word, keeps other traffic out */
/*
 * The transmit power, in dBm at the radio's connector.
 *
 * The band is limited to 10 mW ERP. ERP is referenced to a half-wave dipole,
 * so the number the rule is written in is not the number on the radio:
 *
 *   10 mW ERP = 10 dBm ERP = 12.15 dBm EIRP
 *   12.15 dBm EIRP, less 2 dBi of antenna gain, is 10.15 dBm at the connector
 *
 * 8 dBm is 6.3 mW, about 6.1 mW ERP with a 2 dBi whip. That is under the
 * ceiling with 2 dB to spare, and the margin is deliberate.
 *
 * If the antenna has more gain than 2 dBi, take the same number of dB off this
 * value. If it has less, this value is still safe. Do not raise it.
 *
 * The port station only receives, so this value does not change anything on
 * this board. It is here so the two config.h files can be compared side by
 * side and show the same radio.
 */
#define LORA_TX_POWER 8
#define LORA_SPI_FREQ 4000000 /* 4 MHz is steadier on long dupont wires */

/* --- The receiver on the bench -------------------------------------------- */
/*
 * The researchers measure the accuracy of the GPS inside one receiver. That
 * receiver is a unit like the ones on the boats: it sends the same radio
 * packet, with its own id. The port station notices the id and forwards the
 * packet as a receiver, so the console knows which GPS produced the position,
 * and the bench never sees a boat's position.
 *
 * To put a receiver on the bench, set its FERRY_ID to BENCH_UNIT_ID and flash
 * it. The name below is what the console shows for it, and it is the name the
 * researchers type into the **Connect a GPS** box on the bench page.
 *
 * The name may use letters, numbers, dot, dash and underscore.
 */
#define BENCH_UNIT_ID 90
#define BENCH_DEVICE_NAME "RX-1"

/* --- Display (SSD1306 OLED on I2C) -------------------------------------- *//*
 * The display is optional. The port station works without it: the Serial
 * Monitor shows everything the display would have shown.
 *
 * Set this to 0 if there is no display fitted, and the sketch will not need
 * the Adafruit SSD1306 or Adafruit GFX libraries at all. Leave it at 1 if
 * there is a 0.96 inch SSD1306 on the four pins below.
 */
#define USE_DISPLAY 1
#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDRESS 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 64

/* --- How long to wait for the PC before trying again -------------------- */
#define POST_TIMEOUT_MS 8000

/*
 * How many times one packet is offered to the PC before it is dropped.
 * A repeat is safe: the sequence number tells the PC it has already seen it.
 */
#define POST_TRIES 5

/*
 * How long the board waits for the network before it gives up on it and
 * carries on. The boat keeps sending either way.
 */
#define WIFI_ATTEMPTS 40
#define WIFI_WAIT_MS 500

/* --- The board's own setup page ------------------------------------------- */
/*
 * When the board has no network at all, it cannot reach the PC, and there is
 * nothing the console can do about it. So the board puts up a small network of
 * its own, and a page on it where a phone can type the network in.
 *
 * Join the Wi-Fi called Freery-Setup, open http://192.168.4.1 in any browser,
 * and the page asks for the name and the password of the network the board
 * should use. The board remembers it, so this is only needed once.
 *
 * The page also comes up when the board has a network but cannot reach the PC
 * for a while, which happens when the PC moves to another network. That way a
 * person can fix it without opening the Arduino IDE.
 */
#define SETUP_AP_NAME "Freery-Setup"

/*
 * The pin that brings the setup page up, and the way out of a network that is
 * no longer there.
 *
 * Put a jumper wire between this pin and GND, or fit a button between them.
 * Then:
 *
 *   - hold it down while the board starts, and the setup page comes up at
 *     once;
 *   - hold it down for a few seconds while the board is running, and the
 *     setup page comes up then.
 *
 * Either way, a phone joins the board's own network and the network is typed
 * in on a page in the phone. **No computer and no Arduino IDE are needed.**
 * That matters on the day the units are fitted at the port station, where
 * there is no laptop and no IDE.
 *
 * GPIO 27 is free on the usual DevKit board. It must be a pin that is not
 * used by anything else, because it is read with the internal pull-up: the
 * pin is LOW when it is shorted to GND.
 */
#define SETUP_BUTTON_PIN 27

/*
 * How long the setup button has to be held down.
 *
 * Three seconds is long enough that it is not pressed by accident, and short
 * enough that nobody stands there waiting for it.
 */
#define SETUP_HOLD_MS 3000

/* --- How often the board asks the PC for work ----------------------------- */
/*
 * The board asks the PC every few seconds whether it has been given a
 * different network to use. The answer carries that network once, and the
 * board tries it.
 */
#define LINK_INTERVAL_MS 5000

/*
 * How long the board tries to reach the PC before it puts up its own setup
 * page. The PC may simply be switched off for the night, so the board waits a
 * while before it makes a fuss.
 */
#define LINK_GRACE_MS 90000

/*
 * How long a new network is given before it is called a failure. A router
 * that is a long way away, or one with a weak signal, needs a moment.
 */
#define NEW_NETWORK_TIMEOUT_MS 20000

#endif /* FREERY_CONFIG_H */
