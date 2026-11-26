/*
 * Freery — the port station's network.
 *
 * The board at the head station needs a network to reach the PC. Until now the
 * network's name and password were written in the sketch, so changing them
 * meant opening the Arduino IDE and flashing the board again.
 *
 * This file removes that chore:
 *
 *   1. The network is kept in the board's own memory (NVS), so it survives a
 *      power cut and a re-flash.
 *   2. The board asks the PC every few seconds whether it has been given a
 *      different network. The PC hands it over once, and the board tries it.
 *   3. If the new network does not work, the board keeps the network it
 *      already had, so it can still tell the PC that the new one failed.
 *   4. If the board has no network at all, it puts up a small network of its
 *      own, called Freery-Setup, with a page on it where a phone can type the
 *      network in. That is the only time the Arduino IDE is needed, and only
 *      for the very first setup.
 *
 * The board's name on the PC is STATION_ID, in secrets.h. The PC address and
 * the device key are there too.
 *
 * Board: ESP32 DevKit.
 * Libraries: WiFi, DNSServer, WebServer, Preferences. All of them come with
 * the ESP32 board package, so nothing extra has to be installed.
 */

#ifndef FREERY_NETWORK_H
#define FREERY_NETWORK_H

#include <Arduino.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>

#include <ctype.h>
#include <stdlib.h>
#include <string.h>

#include "config.h"
#include "secrets.h"

/**
 * The board's network.
 *
 * One of these is made once, in the sketch, and the sketch calls into it:
 *
 *   network.begin();      once, when the board starts
 *   network.maintain();   every time round the loop
 *   network.askThePc();   when there is nothing else to send
 */
class PortStationNetwork {
 public:
  /** Reads the network out of the board's memory and gets on it. */
  void begin();

  /**
   * Keeps everything going.
   *
   * Called very often, so it has to be cheap. It drops the setup page when it
   * is no longer needed, serves the setup page when it is up, and puts the
   * setup page up when the board cannot reach the PC for a while.
   */
  void maintain();

  /**
   * Asks the PC whether the board has been given a new network.
   *
   * It does nothing until LINK_INTERVAL_MS has passed, so it can be called as
   * often as the loop likes.
   */
  void askThePc();

  /** True when the board is on a network and can reach the PC. */
  bool isConnected() const { return WiFi.status() == WL_CONNECTED; }

  /**
   * Makes sure the board is on its network.
   *
   * Returns true when it is. When the network dropped, this gets it back.
   * The sketch calls this before it posts anything, so it has to be public.
   */
  bool ensureConnected();

  /** True when the setup page is up. */
  bool isSetupOpen() const { return apOpen; }

  /** The name of the network the board is on. */
  String currentSsid() const { return activeSsid; }

  /** The address the board has on its network. */
  String currentIp() const;

  /**
   * What the board says about itself: "connected", "failed" or "setup".
   *
   * This is what the PC shows on the console.
   */
  const char *status() const { return boardStatus; }

  /** The last thing that happened, for the display and the Serial Monitor. */
  String notice() const { return lastNotice; }

  /** The network the board remembers, which may not be the one it is on. */
  String rememberedSsid() const { return storedSsid; }

  /**
   * Puts the board into setup mode.
   *
   * The board puts up a network of its own, called Freery-Setup, and a page on
   * it. A phone joins that network, opens http://192.168.4.1, and the name and
   * the password of the network the board should use are typed in.
   *
   * **Nothing else is needed.** No computer, no Arduino IDE, no cable to a
   * laptop. This is how the board is set up on the day it is fitted at the
   * port station, and it is how a board is rescued when the network it was
   * given has gone away.
   */
  void openSetupMode();

  /**
   * Builds the list of networks in range, as JSON.
   *
   * The strongest network comes first, because that is the one a person is
   * most likely to want. A network with no password is marked, so that
   * somebody knows not to type anything into the password box.
   *
   * It is a function of its own, and it takes the list as an argument, so that
   * it can be checked on a PC — without a board, and without a radio.
   */
  static String networksJson(const String *names, const int *rssi, const bool *open, int count);

  /**
   * Builds the setup page.
   *
   * It is public so that the page can be rendered and looked at on a PC, in
   * the same way the board renders it.
   */
  String pageFor(const String &message, const String &tone, const String &ssid) const;

 private:
  void say(const String &message);
  void loadStored();
  void storeNetwork(const String &ssid, const String &pass);

  /**
   * Joins a network.
   *
   * When keepAp is true the setup page stays up, so a phone that is halfway
   * through setting the board up does not lose its connection.
   */
  bool join(const String &ssid, const String &pass, uint32_t timeoutMs, bool keepAp);

  void startSetupPage();
  void stopSetupPage();
  void serveSetupPage();
  void handleSave();
  void handleScan();

  /**
   * Watches the setup button.
   *
   * Holding it down for SETUP_HOLD_MS opens the setup page, whether the board
   * is on a network or not. That is the way out of a network that is no longer
   * there, and it is how a board is set up on the day it is fitted.
   */
  void checkSetupButton(uint32_t now);

  /** True when the PC answered the last time the board asked. */
  bool pcReachable = false;

  Preferences prefs;
  String storedSsid;
  String storedPass;
  String activeSsid;
  String lastNotice;
  const char *boardStatus = "setup";

  bool apOpen = false;
  /** The moment the setup page should close, if it was asked to close. */
  uint32_t closeSetupAt = 0;

  uint32_t lastLinkMs = 0;
  uint32_t lastCheckMs = 0;
  uint32_t firstFailureMs = 0;
  bool sawFailure = false;

  /** When the setup button was first held down, and whether it was acted on. */
  uint32_t buttonHeldSince = 0;
  bool buttonAlreadyOpened = false;

  WebServer apServer{80};
  DNSServer apDns;
};

/* --- Small helpers -------------------------------------------------------- */

/**
 * Reads a string out of a piece of JSON.
 *
 * The answer from the PC is small and flat, so a full JSON library is more
 * than the board needs. This finds "key":"value" and copies the value, taking
 * the escapes out of it.
 *
 * Returns false when the key is not there.
 */
static bool readJsonString(const String &text, const char *key, String &out) {
  String needle = "\"";
  needle += key;
  needle += "\":";
  int at = text.indexOf(needle);
  if (at < 0) return false;

  const unsigned int len = text.length();
  unsigned int i = (unsigned int)at + needle.length();
  while (i < len && (text[i] == ' ' || text[i] == '\t')) i++;
  if (i >= len || text[i] != '"') return false;
  i++;

  out = "";
  while (i < len) {
    char c = text[i];

    if (c == '\\' && i + 1 < len) {
      char next = text[i + 1];
      i += 2;
      switch (next) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case '/': out += '/'; break;
        case 'u': {
          /* A \uXXXX escape. The four digits are read as one number and put out
             as UTF-8, which covers every character a network name or a network
             password is likely to hold. */
          if (i + 4 <= len) {
            unsigned int code = strtoul(text.substring(i, i + 4).c_str(), nullptr, 16);
            i += 4;
            if (code < 0x80) {
              out += (char)code;
            } else if (code < 0x800) {
              out += (char)(0xC0 | (code >> 6));
              out += (char)(0x80 | (code & 0x3F));
            } else {
              out += (char)(0xE0 | (code >> 12));
              out += (char)(0x80 | ((code >> 6) & 0x3F));
              out += (char)(0x80 | (code & 0x3F));
            }
          }
          break;
        }
        default: out += next; break;
      }
      continue;
    }

    if (c == '"') return true;
    out += c;
    i++;
  }
  return false;
}

/** Reads a whole number out of a piece of JSON. */
static bool readJsonNumber(const String &text, const char *key, long &out) {
  String needle = "\"";
  needle += key;
  needle += "\":";
  int at = text.indexOf(needle);
  if (at < 0) return false;

  const unsigned int len = text.length();
  unsigned int i = (unsigned int)at + needle.length();
  while (i < len && (text[i] == ' ' || text[i] == '\t')) i++;

  bool negative = false;
  if (i < len && text[i] == '-') {
    negative = true;
    i++;
  }
  if (i >= len || !isdigit((unsigned char)text[i])) return false;

  long value = 0;
  while (i < len && isdigit((unsigned char)text[i])) {
    value = value * 10 + (text[i] - '0');
    i++;
  }
  out = negative ? -value : value;
  return true;
}

/**
 * Puts a string into a piece of JSON.
 *
 * A network name may hold a quote or a backslash, and those have to be
 * escaped or the PC will not be able to read what the board said.
 */
static String jsonEscape(const String &text) {
  String out;
  const unsigned int len = text.length();
  out.reserve(len + 8);
  for (unsigned int i = 0; i < len; i++) {
    char c = text[i];
    if (c == '"' || c == '\\') {
      out += '\\';
      out += c;
    } else if (c == '\n') {
      out += "\\n";
    } else if (c == '\r') {
      out += "\\r";
    } else if (c == '\t') {
      out += "\\t";
    } else {
      out += c;
    }
  }
  return out;
}

/* --- The class ------------------------------------------------------------ */

void PortStationNetwork::say(const String &message) {
  lastNotice = message;
  Serial.println(message);
}

void PortStationNetwork::loadStored() {
  prefs.begin("freery", true);
  storedSsid = prefs.getString("ssid", "");
  storedPass = prefs.getString("pass", "");
  prefs.end();
}

void PortStationNetwork::storeNetwork(const String &ssid, const String &pass) {
  prefs.begin("freery", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
  storedSsid = ssid;
  storedPass = pass;
}

bool PortStationNetwork::join(const String &ssid, const String &pass, uint32_t timeoutMs,
                              bool keepAp) {
  if (ssid.length() == 0) return false;

  if (keepAp) {
    /*
     * The setup page stays up. Only the connection to the network is dropped,
     * so a phone that is in the middle of setting the board up keeps working.
     */
    WiFi.disconnect(false, false);
  } else {
    /*
     * The radio is turned off and on. That is the only way to make the board
     * let go of a network it is stuck on, which is exactly what happens when
     * the router is moved or renamed.
     */
    WiFi.disconnect(true, false);
    delay(120);
    WiFi.mode(WIFI_STA);
  }
  delay(120);

  /*
   * An empty password means the network is open. The library has to be told
   * that with no password at all, because an empty string means "a password
   * that happens to be nothing", and that will not join an open network.
   */
  WiFi.begin(ssid.c_str(), pass.length() > 0 ? pass.c_str() : nullptr);

  uint32_t started = millis();
  while (millis() - started < timeoutMs) {
    if (WiFi.status() == WL_CONNECTED) {
      activeSsid = ssid;
      return true;
    }
    delay(200);
  }

  WiFi.disconnect(false, false);
  return false;
}

String PortStationNetwork::currentIp() const {
  if (WiFi.status() != WL_CONNECTED) return "";
  return WiFi.localIP().toString();
}

void PortStationNetwork::begin() {
  Serial.println("Looking for the network the board remembers.");
  loadStored();

  /*
   * The setup button is checked first. When it is held down the board is put
   * straight into the setup page, which is the way to reach it on purpose.
   */
  pinMode(SETUP_BUTTON_PIN, INPUT_PULLUP);
  bool askedForSetup = digitalRead(SETUP_BUTTON_PIN) == LOW;

  String wanted = storedSsid;
  String wantedPass = storedPass;

  /*
   * A board that has never been set up has no network in its memory. The one
   * in the sketch is used once, so a board that was flashed on a bench still
   * works, and then the network given from the console replaces it.
   */
  if (wanted.length() == 0 && strlen(WIFI_SSID) > 0 && strcmp(WIFI_SSID, "your-router-name") != 0) {
    wanted = WIFI_SSID;
    wantedPass = WIFI_PASS;
    say("Using the network in the sketch for now. It will be replaced by the one given from the console.");
  }

  if (!askedForSetup && wanted.length() > 0) {
    say("Trying " + wanted);
    if (join(wanted, wantedPass, WIFI_ATTEMPTS * WIFI_WAIT_MS, false)) {
      boardStatus = "connected";
      say("The board is on " + wanted + ", at " + currentIp());
      return;
    }
    say("It could not get on " + wanted + ".");
    /*
     * The status stays "failed" on purpose. The console has a line for it, and
     * it says more than "waiting to be set up" does: it says the board tried a
     * network and was turned away, which points at the password or the network
     * rather than at the person who has to type one in.
     */
    boardStatus = "failed";
  } else {
    /* There was no network to try, so the board is waiting to be given one. */
    boardStatus = "setup";
  }

  /*
   * The setup page comes up either way. It is how a person fixes a board that
   * could not get on the network by itself, so it is the way back from both
   * "failed" and "setup".
   */
  openSetupMode();
}

/**
 * Puts the board into setup mode.
 *
 * This is the one way in that does not need a computer. The board puts up a
 * network of its own and a page on it, and a phone does the rest.
 */
void PortStationNetwork::openSetupMode() {
  startSetupPage();
  say("The board is putting up its own network, called " + String(SETUP_AP_NAME) + ".");
  say("Join that network and open http://192.168.4.1 in a browser.");
  say("Type the name and the password of the network the board should use.");
}

/**
 * Watches the setup button.
 *
 * The button is a jumper wire, or a button, between the pin and GND. It is
 * read with the internal pull-up, so the pin is LOW while it is held down.
 */
void PortStationNetwork::checkSetupButton(uint32_t now) {
  if (digitalRead(SETUP_BUTTON_PIN) != LOW) {
    buttonHeldSince = 0;
    buttonAlreadyOpened = false;
    return;
  }

  /* The button has just been pressed down. The clock starts now, so that the
     hold has to be a deliberate one. */
  if (buttonHeldSince == 0) {
    buttonHeldSince = now;
    return;
  }

  if (now - buttonHeldSince < SETUP_HOLD_MS) return;
  if (buttonAlreadyOpened) return;

  buttonAlreadyOpened = true;
  say("The setup button was held down.");
  openSetupMode();
}

void PortStationNetwork::startSetupPage() {
  if (apOpen) return;

  apOpen = true;
  closeSetupAt = 0;

  /*
   * The board keeps its own connection while the setup page is up, so it can
   * still talk to the PC and say that it is waiting to be set up.
   */
  WiFi.mode(WIFI_AP_STA);
  bool up = WiFi.softAP(SETUP_AP_NAME, SETUP_AP_PASSWORD);

  apDns.start(53, "*", WiFi.softAPIP());
  apServer.on("/", HTTP_GET, [this]() { serveSetupPage(); });
  apServer.on("/save", HTTP_POST, [this]() { handleSave(); });
  apServer.on("/scan", HTTP_GET, [this]() { handleScan(); });
  apServer.onNotFound([this]() { serveSetupPage(); });
  apServer.begin();

  say(up ? "The setup page is up on " + WiFi.softAPIP().toString() + "."
            : "The setup page could not be put up.");
}

void PortStationNetwork::stopSetupPage() {
  if (!apOpen) return;
  apOpen = false;
  apServer.stop();
  apDns.stop();

  /*
   * The setup network is closed by putting the radio back into station mode.
   *
   * `softAPdisconnect` is deliberately not used here. On the ESP32 the version
   * that turns the radio off takes the connection to the PC with it, and the
   * board would have to find the network again on its own.
   */
  WiFi.mode(WIFI_STA);
  delay(200);

  /* If the connection to the PC went with the setup network, get it back. */
  if (!isConnected() && storedSsid.length() > 0) {
    say("Getting the network back.");
    join(storedSsid, storedPass, WIFI_ATTEMPTS * WIFI_WAIT_MS, false);
  }

  say("The setup page is closed.");
}

void PortStationNetwork::maintain() {
  uint32_t now = millis();

  /* The setup page was asked to close. It is closed now, not before, so that
     the reply that was being sent has finished. */
  if (apOpen && closeSetupAt != 0 && now >= closeSetupAt) {
    closeSetupAt = 0;
    stopSetupPage();
  }

  if (apOpen) {
    apDns.processNextRequest();
    apServer.handleClient();
  }

  /*
   * The setup button is watched every time round the loop, so that holding it
   * down opens the page straight away rather than a few seconds later.
   */
  checkSetupButton(now);

  /* Everything else is checked every couple of seconds, not every time round
     the loop. */
  if (now - lastCheckMs < 2000) return;
  lastCheckMs = now;

  /*
   * The board has a network but cannot reach the PC. That happens when the PC
   * moves to another network, and the board cannot be told about the new one
   * because it cannot reach the PC to ask. So after a while the board puts up
   * its own setup page and a person can fix it with a phone.
   */
  if (!pcReachable && isConnected()) {
    if (!sawFailure) {
      sawFailure = true;
      firstFailureMs = now;
    } else if (now - firstFailureMs >= LINK_GRACE_MS && !apOpen) {
      boardStatus = "setup";
      say("The PC has not answered for a while. Putting up the setup page.");
      startSetupPage();
    }
  }
}

bool PortStationNetwork::ensureConnected() {
  if (isConnected()) return true;
  if (storedSsid.length() == 0) return false;

  /*
   * The network dropped. The board gets it back rather than leaving the boat
   * off the map for good.
   *
   * This is done here, and not on every time round the loop, because getting
   * the network back takes a while, and the radio should not be left waiting
   * while that happens. A boat's packet would be lost.
   */
  say("The network dropped. Getting it back.");
  if (join(storedSsid, storedPass, WIFI_ATTEMPTS * WIFI_WAIT_MS, apOpen)) {
    boardStatus = "connected";
    say("The board is back on " + storedSsid + ".");
    return true;
  }
  return false;
}

void PortStationNetwork::askThePc() {
  uint32_t now = millis();
  if (now - lastLinkMs < LINK_INTERVAL_MS) return;
  lastLinkMs = now;

  if (!ensureConnected()) return;

  /*
   * The board says which network it is on, and asks whether it has been given
   * another one. It never sends the password of the network it is on.
   */
  String body = "{\"stationId\":\"" + jsonEscape(String(STATION_ID)) + "\"";
  body += ",\"wifi\":{\"ssid\":\"" + jsonEscape(activeSsid) + "\"";
  body += ",\"status\":\"" + String(boardStatus) + "\"";
  body += ",\"ip\":\"" + jsonEscape(currentIp()) + "\"}}";

  HTTPClient http;
  http.setTimeout(POST_TIMEOUT_MS);
  http.begin(String(PC_BASE_URL) + "/api/device/link");
  http.addHeader("x-device-key", DEVICE_KEY);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  String answer = http.getString();
  http.end();

  if (code != 200) {
    pcReachable = false;
    say("The PC did not answer the link (" + String(code) + ").");
    return;
  }
  pcReachable = true;
  sawFailure = false;

  /*
   * The answer carries a network when there is one to be given. The password
   * comes out of the PC exactly once, and it is never kept here.
   */
  long id = 0;
  String wantedSsid;
  String wantedPass;
  if (!readJsonNumber(answer, "id", id) ||
      !readJsonString(answer, "ssid", wantedSsid) ||
      !readJsonString(answer, "password", wantedPass)) {
    return;
  }
  if (wantedSsid.length() == 0) return;

  say("The PC gave a new network: " + wantedSsid);

  /*
   * The network that is being replaced is remembered, so the board can go back
   * to it if the new one does not work. The board has to be able to reach the
   * PC to say that it failed.
   */
  String oldSsid = storedSsid;
  String oldPass = storedPass;

  if (join(wantedSsid, wantedPass, NEW_NETWORK_TIMEOUT_MS, apOpen)) {
    storeNetwork(wantedSsid, wantedPass);
    boardStatus = "connected";
    say("The board is on " + wantedSsid + " now, at " + currentIp());
    if (apOpen) closeSetupAt = millis() + 3000;
    return;
  }

  boardStatus = "failed";
  say("It could not get on " + wantedSsid + ".");

  if (oldSsid.length() > 0) {
    say("Going back to " + oldSsid + ".");
    if (join(oldSsid, oldPass, NEW_NETWORK_TIMEOUT_MS, apOpen)) {
      activeSsid = oldSsid;
      say("The board is back on " + oldSsid + " and the PC will be told.");
    }
  }
}

/* --- The setup page ------------------------------------------------------- */

String PortStationNetwork::pageFor(const String &message, const String &tone,
                                   const String &ssid) const {
  String html;
  html.reserve(3000);

  html += F("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">");
  html += F("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">");
  html += F("<title>Freery setup</title><style>");
  html += F("body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:20px;");
  html += F("background:#f4f7f8;color:#16232b;line-height:1.5}");
  html += F("h1{font-size:20px;margin:0 0 4px}");
  html += F("p.lead{color:#5b6b76;margin:0 0 18px;font-size:14px}");
  html += F("form{background:#fff;border:1px solid #dbe3e8;border-radius:14px;padding:16px}");
  html += F("label{display:block;font-size:13px;font-weight:600;margin:0 0 6px}");
  html += F("input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:12px;");
  html += F("font-size:16px;border:1px solid #c8d4da;border-radius:10px;margin-bottom:14px}");
  html += F("button{width:100%;padding:13px;font-size:16px;font-weight:600;border:0;border-radius:10px;");
  html += F("background:#0b6b57;color:#fff;cursor:pointer}");
  html += F("button.secondary{background:#e8eef1;color:#16232b;margin-top:10px}");
  html += F(".note{background:#fff;border:1px solid #dbe3e8;border-radius:14px;padding:14px;margin-top:16px}");
  html += F("ul{list-style:none;padding:0;margin:10px 0 0}");
  html += F("li{padding:9px 10px;border:1px solid #e2e9ec;border-radius:9px;margin-bottom:6px;");
  html += F("font-size:15px;cursor:pointer;background:#fbfdfd}");
  html += F(".msg{border-radius:10px;padding:11px 13px;font-size:14px;margin-bottom:14px}");
  html += F(".msg.good{background:#e8f6f0;color:#066a49}");
  html += F(".msg.bad{background:#fdeceb;color:#8f2c24}");
  html += F(".msg.work{background:#eef3f6;color:#33454f}");
  html += F("</style></head><body>");
  html += F("<h1>Freery port station</h1>");
  html += F("<p class=\"lead\">This board needs the name and the password of the network it should use. ");
  html += F("Type them in and the board joins. ");
  html += F("<strong>Nothing else is needed</strong> \xe2\x80\x94 no computer and no Arduino IDE.</p>");

  if (activeSsid.length() > 0) {
    html += F("<p class=\"lead\">The board is on <strong>");
    html += jsonEscape(activeSsid);
    html += F("</strong> right now.</p>");
  } else if (storedSsid.length() > 0) {
    html += F("<p class=\"lead\">The board remembers <strong>");
    html += jsonEscape(storedSsid);
    html += F("</strong>, but it is not on it now.</p>");
  }

  if (message.length() > 0) {
    html += F("<div class=\"msg ");
    html += tone;
    html += F("\">");
    html += message;
    html += F("</div>");
  }

  html += F("<form method=\"POST\" action=\"/save\">");
  html += F("<label for=\"ssid\">Network name</label>");
  html += F("<input type=\"text\" id=\"ssid\" name=\"ssid\" autocomplete=\"off\" autocapitalize=\"none\" spellcheck=\"false\" value=\"");
  html += jsonEscape(ssid.length() > 0 ? ssid : storedSsid);
  html += F("\">");
  html += F("<label for=\"pass\">Network password</label>");
  html += F("<input type=\"password\" id=\"pass\" name=\"pass\" autocomplete=\"off\">");
  html += F("<button type=\"submit\">Save and connect</button>");
  html += F("</form>");

  html += F("<div class=\"note\"><strong style=\"font-size:14px\">Networks near here</strong>");
  html += F("<p class=\"lead\" style=\"margin:6px 0 10px\">Tap a network to put its name in the box above. ");
  html += F("The board's Wi-Fi is 2.4 GHz only, so if the router puts out two names, pick the 2.4 GHz one.</p>");
  html += F("<button class=\"secondary\" type=\"button\" onclick=\"scan()\">Find the networks</button>");
  html += F("<ul id=\"found\"></ul></div>");

  html += F("<p class=\"lead\" style=\"margin-top:16px\">");
  html += F("The board remembers the network, so this page is only needed once. ");
  html += F("After that the network is changed from the console on the PC.");
  html += F("</p>");

  html += F("<script>function scan(){var u=document.getElementById('found');u.innerHTML='Looking...';");
  html += F("fetch('/scan').then(function(r){return r.json()}).then(function(list){");
  html += F("if(!list.length){u.innerHTML='<li>No networks found</li>';return;}");
  html += F("u.innerHTML='';list.forEach(function(n){var li=document.createElement('li');");
  html += F("var bars='';var level=Math.max(0,Math.min(4,Math.round((n.rssi+100)/20)));");
  html += F("for(var i=0;i<4;i++){bars+=i<level?'\\u25D2':'\\u25D1';}");
  html += F("li.textContent=n.ssid+'   '+bars+'  '+n.rssi+' dBm'+(n.open?'  (no password)':'');");
  html += F("li.onclick=function(){document.getElementById('ssid').value=n.ssid;");
  html += F("document.getElementById('pass').focus();};");
  html += F("u.appendChild(li);});}).catch(function(){u.innerHTML='<li>Could not look</li>';});}");
  html += F("</script></body></html>");

  return html;
}

void PortStationNetwork::serveSetupPage() {
  String message;
  String tone = "work";

  if (boardStatus != nullptr && strcmp(boardStatus, "setup") == 0) {
    message = "Waiting for the network to be set.";
    tone = "work";
  }

  apServer.send(200, "text/html", pageFor(message, tone, storedSsid));
}

void PortStationNetwork::handleSave() {
  String ssid = apServer.arg("ssid");
  ssid.trim();
  String pass = apServer.arg("pass");

  if (ssid.length() == 0) {
    apServer.send(400, "text/html", pageFor("The name of the network is needed.", "bad", ""));
    return;
  }

  /*
   * The board tries the network before the answer is sent, because the answer
   * has to say whether it worked. That takes up to twenty seconds, so the
   * browser waits on a blank page for a moment.
   *
   * The answer is sent in one piece. The web server writes a Content-Length
   * header when it sends, so anything written after that would make the reply
   * longer than the header says, and the browser would not know what to do
   * with it.
   */
  say("The setup page is giving the board the network " + ssid + ".");

  bool worked = join(ssid, pass, NEW_NETWORK_TIMEOUT_MS, true);

  if (worked) {
    storeNetwork(ssid, pass);
    boardStatus = "connected";
    say("The setup page gave the board the network " + ssid + ".");
    apServer.send(
        200, "text/html",
        pageFor("The board is on " + ssid + " now. You can close this page.", "good", ssid));
    /* The page is closed a moment later, so that this reply finishes first. */
    closeSetupAt = millis() + 3000;
    return;
  }

  /*
   * It did not work. The board goes back to the network it had, so it can
   * still reach the PC, and the page stays up with the form on it so that the
   * name or the password can be corrected and sent again.
   */
  say("The setup page could not get the board on " + ssid + ".");
  if (storedSsid.length() > 0 && storedSsid != ssid) {
    say("Going back to " + storedSsid + ".");
    join(storedSsid, storedPass, NEW_NETWORK_TIMEOUT_MS, true);
  }
  apServer.send(
      200, "text/html",
      pageFor("It could not get on that network. Check the name and the password, and try again.",
              "bad", ssid));
}

/**
 * Builds the list of networks in range, as JSON.
 *
 * The strongest network comes first, because that is the one a person is most
 * likely to want. A network with no password is marked, so that somebody knows
 * not to type anything into the password box.
 */
String PortStationNetwork::networksJson(const String *names, const int *rssi,
                                        const bool *open, int count) {
  const int limit = count < 32 ? count : 32;

  /*
   * The list is put in order by signal. The sort is simple on purpose: the
   * list is never long, and the code has to stay small.
   */
  int order[32];
  for (int i = 0; i < limit; i++) order[i] = i;
  for (int i = 1; i < limit; i++) {
    int chosen = order[i];
    int at = i - 1;
    while (at >= 0 && rssi[order[at]] < rssi[chosen]) {
      order[at + 1] = order[at];
      at--;
    }
    order[at + 1] = chosen;
  }

  String json = "[";
  for (int i = 0; i < limit; i++) {
    const int index = order[i];
    if (i > 0) json += ",";
    json += "{\"ssid\":\"";
    json += jsonEscape(names[index]);
    json += "\",\"rssi\":";
    json += String(rssi[index]);
    json += ",\"open\":";
    json += open[index] ? "true" : "false";
    json += "}";
  }
  json += "]";
  return json;
}

void PortStationNetwork::handleScan() {
  int found = WiFi.scanNetworks();

  String names[32];
  int rssi[32];
  bool open[32];

  const int limit = found < 32 ? found : 32;
  for (int i = 0; i < limit; i++) {
    names[i] = WiFi.SSID(i);
    rssi[i] = WiFi.RSSI(i);
    open[i] = WiFi.encryptionType(i) == WIFI_AUTH_OPEN;
  }
  WiFi.scanDelete();

  apServer.send(200, "application/json", networksJson(names, rssi, open, limit));
}

#endif /* FREERY_NETWORK_H */
