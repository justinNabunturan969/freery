/*
 * Freery — the ferry unit.
 *
 * This is the board that rides on the boat. It has a GPS module and a LoRa
 * radio, and it has no internet access and no device key: it never talks to the
 * PC directly.
 *
 * What it does:
 *   1. Reads the GPS every loop.
 *   2. Every SEND_INTERVAL_MS, if there is a fresh fix, sends one short plain
 *      text packet over LoRa:
 *
 *          F1,14.2851,121.4123,18.5,1042,1.12,9
 *
 *      That is the ferry id, the latitude, the longitude, the speed in km/h,
 *      the sequence number, the horizontal dilution of precision and the
 *      number of satellites the fix was made from. The sequence number goes up
 *      by one every time, and it is what lets the PC work out the packet
 *      success rate from the gaps. It also stops a repeated packet from moving
 *      the boat twice.
 *
 *      The last two fields are the receiver's own opinion about how good the
 *      fix is. They are what the accuracy page needs to say how much the
 *      receiver trusted each point, so they travel with the point instead of
 *      being worked out later. The port station still accepts the older five
 *      field packet, so a unit that was flashed before this change keeps
 *      working.
 *
 * The port station receives this and forwards it to the PC.
 *
 * Board: ESP32 DevKit.
 * Libraries: TinyGPSPlus (Mikko Hart) and Arduino-LoRa (Sandeep Mistry),
 * version 0.8.0 or newer.
 *
 * The first fix can take several minutes, outdoors, with a clear view of the
 * sky. Open the Serial Monitor at 115200 baud.
 */

#include <Arduino.h>
#include <LoRa.h>
#include <TinyGPS++.h>

#include "config.h"

static TinyGPSPlus gps;
static HardwareSerial gpsSerial(2);

static unsigned long lastSend = 0;
static unsigned long packetCount = 0;
/* The first packet that goes out carries exactly FERRY_SEQ_START. */
static uint32_t sequence = (uint32_t)FERRY_SEQ_START - 1;
/* Whether the GPS was talking the last time round, so the monitor stays quiet. */
static bool hadFix = false;

/**
 * Puts the radio up.
 *
 * The Arduino-LoRa library wants the pins first, then the frequency, and then
 * the rest of the radio settings one at a time. The order matters: the
 * bandwidth and the spreading factor together decide the low power mode, so
 * the spreading factor is set first and the bandwidth last.
 *
 * Returns false when the radio did not answer, which means the wiring is
 * wrong or the two boards are set up differently.
 */
static bool startRadio() {
  /* The library takes the pins in this order: chip select, reset, DIO0. */
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQ)) {
    return false;
  }

  LoRa.setSPIFrequency(LORA_SPI_FREQ);
  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(LORA_BW);
  /* The library wants the denominator (5 to 8), not the 4/8 ratio. */
  LoRa.setCodingRate4(LORA_CR + 4);
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.setTxPower(LORA_TX_POWER);

  return true;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.printf("Freery ferry unit, boat id %d\n", FERRY_ID);

  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);

  /*
   * The radio has to be set up before it is used. On the ESP32 the library
   * needs to know which pins it is on, because the ESP32 has more than one
   * SPI bus and more than one chip select.
   */
  if (!startRadio()) {
    Serial.println("The radio did not start. Check the wiring and the settings.");
    Serial.println("The two units must have the same frequency, spreading factor,");
    Serial.println("bandwidth, coding rate and sync word.");
    while (true) {
      delay(1000);
    }
  }

  Serial.printf("Radio up at %.3f MHz, spreading factor %d\n",
                (double)LORA_FREQ / 1000000.0, LORA_SF);
  Serial.printf("Packet numbers start at %lu. The PC ignores anything that is not\n",
                (unsigned long)FERRY_SEQ_START);
  Serial.println("higher than the last number it has seen from this boat.");
  Serial.println("If the PC has a higher number, the port station corrects it.");

#if STATUS_LED >= 0
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);
#endif

  Serial.println("Waiting for a GPS fix.");
}

/** Prints the fix status only when it changes, so the monitor stays readable. */
static void reportFix(bool fixed) {
#if STATUS_LED >= 0
  digitalWrite(STATUS_LED, fixed ? HIGH : LOW);
#endif
  if (fixed == hadFix) {
    return;
  }
  hadFix = fixed;
  Serial.println(fixed ? "Fix." : "No fix yet.");
}

void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastSend < SEND_INTERVAL_MS) {
    return;
  }
  lastSend = millis();

  /*
   * The fix has to be valid AND recent.
   *
   * isValid() says the GPS has told us a position at least once. age() says
   * how many milliseconds ago that was. Together they mean "the GPS is talking
   * now", not "the GPS worked once". Without the age check a board with a
   * dead GPS would keep sending the last position it ever saw and the boat
   * would look alive on the map when it is not.
   */
  if (!gps.location.isValid() || gps.location.age() > FIX_STALE_MS) {
    reportFix(false);
    return;
  }

  double lat = gps.location.lat();
  double lon = gps.location.lng();

  /* A fix of exactly zero and zero is not a place. */
  if (lat == 0.0 && lon == 0.0) {
    reportFix(false);
    return;
  }

  double speedKmh = gps.speed.kmph();

  if (speedKmh < 0) {
    speedKmh = 0;
  }
  if (speedKmh > 120) {
    speedKmh = 120;
  }

  /*
   * The receiver's own quality numbers.
   *
   * HDOP says how much the satellites' geometry spread the answer out. Under
   * about 2.0 is a good fix, over 5.0 is a fix the receiver itself would call
   * poor. The satellite count is how many satellites the fix was made from.
   *
   * Both come from the GGA sentence. A receiver that has not sent one yet
   * reports them as not valid, and then the packet carries no quality numbers
   * and the PC leaves them empty rather than making them up.
   */
  bool haveHdop = gps.hdop.isValid();
  bool haveSats = gps.satellites.isValid();
  float hdop = haveHdop ? gps.hdop.hdop() : 0.0f;
  int sats = haveSats ? (int)gps.satellites.value() : 0;

  sequence += 1;

  /*
   * The packet is written with the quality numbers when the receiver has them
   * and without them when it does not, so the port station reads both shapes.
   */
  char payload[80];
  if (haveHdop || haveSats) {
    snprintf(payload, sizeof(payload), "F%d,%.4f,%.4f,%.1f,%lu,%.2f,%d", FERRY_ID,
             lat, lon, speedKmh, (unsigned long)sequence, haveHdop ? hdop : 0.0,
             haveSats ? sats : 0);
  } else {
    snprintf(payload, sizeof(payload), "F%d,%.4f,%.4f,%.1f,%lu", FERRY_ID, lat, lon,
             speedKmh, (unsigned long)sequence);
  }

  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket();

  packetCount += 1;
  Serial.printf("%s  (packet %lu)\n", payload, (unsigned long)packetCount);
  reportFix(true);
}
