/*
 * Freery — the port station.
 *
 * This is the board that sits at the head station. It has a LoRa radio and
 * Wi-Fi, and it is the only part of the system that talks to the PC.
 *
 * What it does:
 *   1. Listens on the radio for the packets the boats send.
 *   2. Turns each one into JSON, adds the radio quality, and POSTs it to
 *      the PC.
 *
 * The radio packet is plain text:
 *
 *     F1,14.2851,121.4123,18.5,1042,1.12,9
 *
 * The last two fields are the receiver's own quality numbers, the HDOP and the
 * satellite count. The older five field packet is still accepted, for a unit
 * that was flashed before they were added.
 *
 * and the POST is:
 *
 *     POST http://<the-pc-ip>:3001/api/ingest
 *     x-device-key: <the device key>
 *     Content-Type: application/json
 *
 *     {"ferryId":1,"lat":14.2851,"lon":121.4123,"speed":18.5,"seq":1042,
 *      "rssi":-92,"snr":7.5,"hdop":1.12,"sats":9}
 *
 * A unit that is on the bench, being measured on its own, is forwarded as a
 * receiver instead of a boat:
 *
 *     {"deviceId":"RX-1","lat":14.2851,"lon":121.4123,"speed":0,"seq":1042,
 *      "rssi":-92,"snr":7.5,"hdop":1.12,"sats":9}
 *
 * The PC answers:
 *     200 {"stored":true}   the packet was stored and the boat moved
 *     200 {"stored":false}  the PC will not take this number, and it says
 *                           which number it has already seen
 *     400                   the packet was malformed, or the boat is unknown
 *     401                   the device key is missing or wrong
 *
 * Five things this board has to survive, because they all happen in the
 * field:
 *
 *   1. The Wi-Fi drops. The board gets the network back instead of giving up
 *      on the boat for good.
 *   2. The PC cannot be reached for a while. The newest position replaces the
 *      one that was waiting, so the boat is where it is now and not where it
 *      was.
 *   3. A boat's own packet numbers end up behind the numbers the PC has
 *      already stored for it, which happens when a unit is re-flashed. The
 *      board reads the number the PC has and corrects its own, so the boat
 *      is never left talking to a PC that will not listen.
 *   4. The key is wrong, or the boat id is not in the database. The board says
 *      which one it is instead of quietly dropping the packet.
 *   5. The boat sends the older packet without the quality numbers. The board
 *      stores it anyway, and leaves the quality empty rather than making it up.
 *
 * The network is not in this file. It is given from the console on the PC and
 * the board remembers it, so changing it does not mean flashing the board
 * again. See network.h for how that works.
 *
 * Board: ESP32 DevKit.
 * Libraries: Arduino-LoRa (Sandeep Mistry) version 0.8.0 or newer,
 * Adafruit SSD1306, Adafruit GFX.
 *
 * Open the Serial Monitor at 115200 baud. It prints every packet with the
 * RSSI and the SNR, and what the PC answered.
 */

#include <Arduino.h>
#include <stdlib.h>
#include <string.h>

#include <HTTPClient.h>
#include <LoRa.h>
#include <WiFi.h>

#include "config.h"

#if USE_DISPLAY
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#endif

#include "secrets.h"
/*
 * The board's own network code.
 *
 * The file is called station_network.h, not network.h, on purpose. The ESP32
 * board package has a library header of its own called Network.h, and the
 * sketch folder is searched first. A file called network.h in this folder would
 * take that name and break the Wi-Fi library. The board package matches names
 * exactly, so a different name here keeps the two apart.
 */
#include "station_network.h"

/*
 * The board's network.
 *
 * It is kept in the board's own memory, it asks the PC every few seconds
 * whether it has been given a different network, and it puts up its own setup
 * page when there is nothing to be on. See network.h.
 */
static PortStationNetwork network;

#if USE_DISPLAY
static Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
#endif

/* --- One packet from a boat ------------------------------------------------ */

struct BoatPacket {
  int ferryId;
  double lat;
  double lon;
  double speed;
  /** The boat's own packet number. */
  unsigned long seq;
  int rssi;
  double snr;
  /**
   * The receiver's own quality numbers, when the boat sent them.
   *
   * A unit flashed before the quality numbers were added sends the older five
   * field packet, and then these two say "not reported".
   */
  bool haveQuality;
  double hdop;
  int sats;
};

/* The packet that has not gone to the PC yet. */
static BoatPacket waiting;
static bool haveWaiting = false;
static int waitingTries = 0;
static String lastLine = "Waiting for a boat";
static String lastDetail = "";
/* The last thing the network module said, so the display can show it. */
static String lastNetworkNotice = "";
/* Whether the setup page is up, so the display only changes when it does. */
static bool lastSetupUp = false;

/*
 * These three are kept here rather than inside loop(). On the ESP32 the
 * Arduino String class asks the heap for its memory, and making a new one
 * every few milliseconds is how a board slowly runs out of memory after a few
 * days in the sun.
 */
static String describe;
static String json;
static String answer;

/* --- The number the PC has already seen ----------------------------------- */
/*
 * A boat's own packet numbers can end up behind the numbers the PC has
 * already stored for it. That happens when a unit is re-flashed, or when the
 * PC is put back from a backup, or when the smoke test on the PC counted
 * ahead. The PC then refuses every packet and says so, and the boat would
 * never move on the map again.
 *
 * So the port station listens to that answer. It works out the difference
 * between the boat's own number and the PC's, and it adds that difference to
 * every packet from that boat from then on. The difference stays the same, so
 * the gaps in the boat's own numbering - the ones that show how many packets
 * were lost on the way - are still there, and the packet success rate on the
 * console still means something.
 */
static const int MAX_BOATS = 8;
static int offsetBoatId[MAX_BOATS];
static long offsetValue[MAX_BOATS];
static int offsetCount = 0;

/** The difference to add to this boat's numbers. */
static long offsetFor(int ferryId) {
  for (int i = 0; i < offsetCount; i++) {
    if (offsetBoatId[i] == ferryId) {
      return offsetValue[i];
    }
  }
  return 0;
}

/** Remembers the difference for this boat. */
static void rememberOffset(int ferryId, long offset) {
  for (int i = 0; i < offsetCount; i++) {
    if (offsetBoatId[i] == ferryId) {
      offsetValue[i] = offset;
      return;
    }
  }
  if (offsetCount < MAX_BOATS) {
    offsetBoatId[offsetCount] = ferryId;
    offsetValue[offsetCount] = offset;
    offsetCount += 1;
  }
}

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

  return true;
}

/** Draws the last thing that happened on the small display. */
static void showScreen(const String &line, const String &detail) {
#if USE_DISPLAY
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.println("Freery port station");
  display.setCursor(0, 12);
  display.println(line.substring(0, 21));
  display.setCursor(0, 26);
  display.println(detail.substring(0, 21));
  display.setCursor(0, 40);
  display.println(detail.substring(21, 42));
  display.setCursor(0, 54);
  display.print(detail.substring(42, 63));

  display.display();
#else
  /* No display is fitted. The Serial Monitor shows everything the display
     would have shown, so nothing is lost. */
  (void)line;
  (void)detail;
#endif
}

/**
 * Posts one packet to the PC.
 *
 * The answer is left in `answer`, because it says whether the PC took the
 * packet and, when it did not, what number the PC has already seen.
 *
 * Returns the HTTP code, or 0 when the PC could not be reached at all.
 */
static int postToPc(const String &body, String &reply) {
  if (!network.ensureConnected()) {
    /* The network drops from time to time. The board gets it back rather than
       leaving the boat off the map for good. */
    reply = "no network";
    return 0;
  }

  HTTPClient http;
  http.setTimeout(POST_TIMEOUT_MS);
  http.begin(String(PC_BASE_URL) + "/api/ingest");
  http.addHeader("x-device-key", DEVICE_KEY);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  reply = http.getString();
  http.end();

  if (code <= 0) {
    reply = "no answer from " + String(PC_BASE_URL);
  }
  return code;
}

/** Reads the number the PC says it has already seen, out of its answer. */
static bool readLastSeq(const String &reply, unsigned long &lastSeq) {
  const char *key = "\"lastSeq\":";
  int at = reply.indexOf(key);
  if (at < 0) {
    return false;
  }
  lastSeq = strtoul(reply.c_str() + at + strlen(key), nullptr, 10);
  return true;
}

/** The JSON the PC wants, for one packet from a unit. */
static String jsonFor(const BoatPacket &packet) {
  long seq = (long)packet.seq + offsetFor(packet.ferryId);
  if (seq < 0) {
    seq = 0;
  }

  String body;
  /*
   * The unit on the bench is a receiver, not a boat.
   *
   * The researchers measure the accuracy of the GPS inside one receiver. That
   * receiver sends the same radio packet as a boat, with its own id, and the
   * port station tells the two apart by that id. The bench then holds the
   * positions of that one GPS, and no boat's position ever comes near it.
   */
  if (packet.ferryId == BENCH_UNIT_ID) {
    body = "{\"deviceId\":\"" BENCH_DEVICE_NAME "\"";
  } else {
    body = "{\"ferryId\":" + String(packet.ferryId);
  }
  body += ",\"lat\":" + String(packet.lat, 6);
  body += ",\"lon\":" + String(packet.lon, 6);
  body += ",\"speed\":" + String(packet.speed, 1);
  body += ",\"seq\":" + String((unsigned long)seq);
  body += ",\"rssi\":" + String(packet.rssi);
  body += ",\"snr\":" + String(packet.snr, 1);
  /*
   * The quality numbers go on only when the boat sent them. The PC leaves them
   * empty otherwise, which is the honest answer for a unit that was flashed
   * before they were added.
   */
  if (packet.haveQuality) {
    body += ",\"hdop\":" + String(packet.hdop, 2);
    body += ",\"sats\":" + String(packet.sats);
  }
  body += "}";
  return body;
}

/**
 * Reads one radio packet and takes it apart.
 *
 * Returns false when there was nothing to read, or when the packet is not
 * one of ours. The reason goes into `describe` when there is one.
 */
static bool readPacket(BoatPacket &packet) {
  describe = "";
  int size = LoRa.parsePacket();
  if (size == 0) {
    return false;
  }

  String radio;
  while (LoRa.available()) {
    radio += (char)LoRa.read();
  }
  radio.trim();

  char idText[12];
  double lat = 0;
  double lon = 0;
  double speed = 0;
  unsigned long seq = 0;
  double hdop = 0;
  int sats = 0;
  bool haveQuality = false;

  /*
   * Two shapes of packet are accepted.
   *
   * The current one carries the receiver's own quality numbers after the
   * sequence number:
   *
   *     F1,14.2851,121.4123,18.5,1042,1.12,9
   *
   * The older one does not, because the unit was flashed before the quality
   * numbers were added:
   *
   *     F1,14.2851,121.4123,18.5,1042
   *
   * The seven field form is tried first. If it does not match, the five field
   * form is tried, and a packet that matches neither is not ours.
   */
  int fields = sscanf(radio.c_str(), "F%11[^,],%lf,%lf,%lf,%lu,%lf,%d", idText, &lat,
                       &lon, &speed, &seq, &hdop, &sats);
  if (fields == 7) {
    haveQuality = true;
  } else {
    fields = sscanf(radio.c_str(), "F%11[^,],%lf,%lf,%lf,%lu", idText, &lat, &lon,
                     &speed, &seq);
    if (fields != 5) {
      describe = "not our packet";
      Serial.printf("Ignored a packet we cannot read: %s\n", radio.c_str());
      return false;
    }
    hdop = 0;
    sats = 0;
    haveQuality = false;
  }

  int ferryId = atoi(idText);
  if (ferryId <= 0 || lat < -90 || lat > 90 || lon < -180 || lon > 180 ||
      speed < 0 || speed > 120) {
    describe = "out of range";
    Serial.printf("Ignored a packet with a bad value: %s\n", radio.c_str());
    return false;
  }

  /*
   * A quality number that makes no sense is dropped rather than sent on. The
   * position is still good, so the packet is still worth keeping.
   */
  if (haveQuality && (hdop < 0 || hdop > 50 || sats < 0 || sats > 64)) {
    haveQuality = false;
    hdop = 0;
    sats = 0;
  }

  packet.ferryId = ferryId;
  packet.lat = lat;
  packet.lon = lon;
  packet.speed = speed;
  packet.seq = seq;
  packet.rssi = (int)LoRa.packetRssi();
  packet.snr = LoRa.packetSnr();
  packet.haveQuality = haveQuality;
  packet.hdop = hdop;
  packet.sats = sats;

  describe = (packet.ferryId == BENCH_UNIT_ID ? "receiver " : "boat ") +
             String(packet.ferryId) + "  rssi " + String(packet.rssi) + "  snr " +
             String(packet.snr, 1) + "  number " + String(seq);
  if (haveQuality) {
    describe += "  hdop " + String(hdop, 2) + "  sats " + String(sats);
  }
  return true;
}

/** The board has nothing to say about this answer. */
static void sayNotStored() {
  Serial.printf("The PC did not take it: %s\n", answer.c_str());
  haveWaiting = false;
  waitingTries = 0;
  showScreen("Not stored", answer);
}

/**
 * Offers the packet that is waiting to the PC and deals with the answer.
 */
static void sendWaiting() {
  json = jsonFor(waiting);
  int code = postToPc(json, answer);

  if (code == 200) {
    if (answer.indexOf("\"stored\":true") >= 0) {
      /* The PC took it. The boat has moved. */
      Serial.printf("The PC took it: %s\n", answer.c_str());
      haveWaiting = false;
      waitingTries = 0;
      showScreen("Sent", answer);
      return;
    }

    /*
     * The PC will not take this number, and it says which number it has
     * already seen. Work out the difference and send it again.
     */
    unsigned long lastSeq = 0;
    if (readLastSeq(answer, lastSeq)) {
      long offset = (long)(lastSeq + 1) - (long)waiting.seq;
      rememberOffset(waiting.ferryId, offset);
      Serial.printf("The PC has seen %lu from boat %d. Adding %ld to its numbers.\n",
                    lastSeq, waiting.ferryId, offset);

      json = jsonFor(waiting);
      answer = "";
      code = postToPc(json, answer);
      if (code == 200 && answer.indexOf("\"stored\":true") >= 0) {
        Serial.printf("The PC took it: %s\n", answer.c_str());
        haveWaiting = false;
        waitingTries = 0;
        showScreen("Sent", answer);
        return;
      }
      if (code == 400) {
        Serial.println("The PC refused the packet. Check the boat id.");
        haveWaiting = false;
        waitingTries = 0;
        showScreen("Refused", "Check the boat id");
        return;
      }
      if (code == 401) {
        Serial.println("The PC refused the key. Check DEVICE_KEY in secrets.h.");
        haveWaiting = false;
        waitingTries = 0;
        showScreen("Refused", "Check the key");
        return;
      }
    }

    /* A repeat, or something else the PC will not take. Wait for the next one. */
    sayNotStored();
    return;
  }

  if (code == 400) {
    Serial.println("The PC refused the packet. Check the boat id.");
    haveWaiting = false;
    waitingTries = 0;
    showScreen("Refused", "Check the boat id");
    return;
  }

  if (code == 401) {
    Serial.println("The PC refused the key. Check DEVICE_KEY in secrets.h.");
    haveWaiting = false;
    waitingTries = 0;
    showScreen("Refused", "Check the key");
    return;
  }

  /* The PC could not be reached. Keep the packet and try again. */
  waitingTries -= 1;
  Serial.printf("The PC did not answer (%s), %d tries left\n", answer.c_str(),
                waitingTries);
  if (waitingTries <= 0) {
    Serial.println("Dropping the packet.");
    haveWaiting = false;
    waitingTries = 0;
    showScreen("Dropped", lastDetail);
  }
  delay(2000);
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("Freery port station");

#if USE_DISPLAY
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
#endif
  showScreen("Starting", "");

  /*
   * The network comes up first, so that the board is reachable from the PC
   * even when the radio is not working. A radio that did not start can then be
   * seen from the console instead of only from the Serial Monitor.
   */
  network.begin();

  if (!startRadio()) {
    Serial.println("The radio did not start. Check the wiring and the settings.");
    Serial.println("The two units must have the same frequency, spreading factor,");
    Serial.println("bandwidth, coding rate and sync word.");
    showScreen("Radio did not start", "Check the wiring");
    while (true) {
      /* The network is still kept up, so the board can still be reached. */
      network.maintain();
      delay(1000);
    }
  }

  Serial.printf("Radio up at %.3f MHz, spreading factor %d\n",
                (double)LORA_FREQ / 1000000.0, LORA_SF);

  showScreen(lastLine, lastDetail);
}
void loop() {
  /*
   * The radio is read every time round, even while the PC cannot be reached.
   * The radio's own buffer is small, and a packet that is not read is lost.
   * The newest position replaces the one that was waiting, so when the PC
   * comes back the boat is where it is now and not where it was.
   *
   * The radio comes first, and the network second, because getting the
   * network back takes a while. A boat's packet must not be lost waiting for
   * that.
   */
  if (readPacket(waiting)) {
    Serial.printf("%s\n", describe.c_str());
    lastLine = "Boat " + String(waiting.ferryId);
    lastDetail = describe;
    haveWaiting = true;
    waitingTries = POST_TRIES;
  } else if (describe.length() > 0) {
    showScreen("Bad packet", describe);
  }

  /*
   * The network is kept up, and the setup page is served when it is up.
   */
  network.maintain();

  /*
   * When the board puts up its setup page, the display says so, because
   * somebody standing at the board needs to know that a phone is the next
   * step. The screen is only redrawn when the state changes, so that it does
   * not flicker.
   */
  bool setupUp = network.isSetupOpen();
  if (setupUp != lastSetupUp) {
    lastSetupUp = setupUp;
    if (setupUp) {
      showScreen("Setup mode", "Join Freery-Setup, open 192.168.4.1");
    } else {
      showScreen(lastLine, lastDetail);
    }
  }

  if (haveWaiting) {
    sendWaiting();
    return;
  }

  /*
   * Nothing to send. This is the moment to ask the PC whether the board has
   * been given a different network to use. It is asked here rather than at the
   * top of the loop, so that a packet from a boat is never held up while the
   * board waits for the PC to answer.
   */
  network.askThePc();

  /* The setup page has its own message on the display, so the network's
     message does not take that screen away. */
  if (!lastSetupUp && network.notice() != lastNetworkNotice) {
    lastNetworkNotice = network.notice();
    showScreen(lastLine, lastNetworkNotice);
  }

  /* Wait a moment instead of spinning on the radio. */
  delay(2);
}
