/*
 * Freery — settings for the ferry unit.
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

/* --- GPS (NEO-6M on UART2) ---------------------------------------------- */
#define GPS_RX 16 /* ESP32 RX2 <- NEO-6M TXD */
#define GPS_TX 17 /* ESP32 TX2 -> NEO-6M RXD */
#define GPS_BAUD 9600

/* --- This boat's id ----------------------------------------------------- */
/*
 * Use the id shown in the console, not the number in the list.
 * Right now: 1, 2, 3, 4 and 21. Ferry 5 is id 21.
 * A boat that does not exist in the database is refused with a 400.
 *
 * A unit that is on the bench, being measured on its own, uses id 90
 * (BENCH_UNIT_ID in the port station's config.h). The port station forwards
 * that unit as a receiver, so the bench holds the positions of that one GPS
 * and no boat's position comes near it.
 */
#define FERRY_ID 1

/* --- Where this boat's packet count starts ------------------------------ */
/*
 * The PC remembers the highest packet number it has seen from each boat, and
 * it ignores anything that is not higher. The console shows that number on the
 * boat's card.
 *
 * The port station now fixes this by itself: if the PC says it has already
 * seen a higher number, the port station works out the difference and adds it
 * to every packet from that boat from then on. So a unit that was re-flashed,
 * or one that starts at 1 while the PC already has a high number, still works.
 *
 * It is still good practice to set this above the number the console shows,
 * so the very first packet is accepted without a correction. It must be at
 * least 1.
 */
#define FERRY_SEQ_START 1

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
 */
#define LORA_TX_POWER 8
#define LORA_SPI_FREQ 4000000 /* 4 MHz is steadier on long dupont wires */

/* --- How often a packet goes out ---------------------------------------- */
#define SEND_INTERVAL_MS 7000

/* --- How old a GPS fix may be before it is thrown away ------------------ */
/*
 * The GPS has to be talking recently, not just once. Without this the board
 * would keep sending the last position it ever saw, long after the GPS had
 * stopped working, and the boat would look alive on the map when it is not.
 */
#define FIX_STALE_MS 15000

/* --- Status LED (optional, set to -1 if there is none) ------------------ */
/*
 * NOT GPIO 2. GPIO 2 is the LoRa DIO0 line, and the radio drives it. Putting
 * an LED on the same pin fights the radio and stops the port station from
 * seeing the packets. GPIO 4 is free on this board.
 */
#define STATUS_LED 4

#endif /* FREERY_CONFIG_H */
