# Freery hardware

The two sketches that connect the real hardware to the system. They speak
exactly the same JSON that the PC's ingest route accepts.

```
hardware/
  ferry_unit/     the board on the boat   -> GPS + LoRa, no internet
  port_station/   the board at the port    -> LoRa + Wi-Fi, talks to the PC
```

Both sketches keep every pin and every radio setting in their own
`config.h`, so nothing else has to be touched when a board is wired
differently.

## What is already filled in

| Where | What | Value |
| --- | --- | --- |
| `port_station/secrets.h` | `PC_BASE_URL` | `http://<your-pc-ip>:3001` — the head station PC's address on the Wi-Fi network. Find it with `ipconfig` |
| `port_station/secrets.h` | `DEVICE_KEY` | already filled in from `apps/admin/.env.local` (a secret, never shown on the display) |
| `port_station/secrets.h` | `WIFI_SSID` / `WIFI_PASS` | **fill these in** — the router the port station is plugged into |
| `ferry_unit/config.h` | `FERRY_ID` | **set per boat**: 1, 2, 3, 4 or 21. Ferry 5 is id 21, because 5 was already taken by a boat that was removed |
| `ferry_unit/config.h` | `FERRY_SEQ_START` | 1. The port station corrects a low number by itself, so this no longer has to be set by hand |
| `port_station/config.h` | `USE_DISPLAY` | 1. Set it to **0** if there is no OLED on the board — the sketch then builds without the Adafruit libraries |

## The libraries

Install these in the Arduino IDE (Board Manager → ESP32 by Espressif):

| Library | Needed by | Author | Version |
| --- | --- | --- | --- |
| TinyGPSPlus | ferry unit | Mikal Hart | 1.1.0 or newer |
| Arduino-LoRa | both | Sandeep Mistry | **0.8.0 or newer** |
| Adafruit SSD1306 | port station, **only if `USE_DISPLAY 1`** | Adafruit | 2.5.x |
| Adafruit GFX | port station, **only if `USE_DISPLAY 1`** | Adafruit | latest |

**The display is optional.** If there is no OLED on the port station, set
`USE_DISPLAY 0` in `port_station/config.h` before you compile it. The sketch
then does not need the two Adafruit libraries at all, and the Serial Monitor
shows everything the display would have shown.

Runbook §4.15 has the full flashing procedure — the Arduino IDE steps and the
`arduino-cli` commands.

### The radio calls are specific to Arduino-LoRa 0.8.0

`Arduino-LoRa` and `RadioLib` have the same name in many guides but they are
**different libraries with different calls**. These sketches use Arduino-LoRa,
so they say:

```cpp
LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);  // chip select, reset, DIO0
LoRa.begin(LORA_FREQ);                        // the frequency only
LoRa.setSpreadingFactor(LORA_SF);
LoRa.setSignalBandwidth(LORA_BW);
LoRa.setCodingRate4(LORA_CR + 4);             // the denominator, 5 to 8
LoRa.setSyncWord(LORA_SYNC);
```

There is no `LoRa.setDIO0()` and no `LoRa.setReset()`, and `begin()` takes one
argument, not five. If you install a different library, these calls have to
change — nothing else does. The packet format, the JSON and the PC contract
stay exactly the same.

## The radio settings must match

`LORA_FREQ`, `LORA_SF`, `LORA_BW`, `LORA_CR` and `LORA_SYNC` have to be the
same in **both** `config.h` files. If they differ, the two boards never hear
each other and nothing arrives.

**The frequency is 433.500 MHz, and it is inside the band that is allowed in
the Philippines.** NTC Memorandum Circular 01-02-2020 (which amends MC
03-05-2007) lists 433.050 to 434.790 MHz at 10 mW ERP for non-specific short
range devices, telemetry, telecommand, alarms and data link. NTC Memorandum
Circular 04-08-2015 puts telemetry on 433.0 to 434.0 MHz simplex. 433.500 MHz
sits in the middle of both, with room for the 125 kHz channel on either side.
The RA-02 covers roughly 410 to 525 MHz, so it can do it.

> **Confirm the channel with the NTC or with the adviser before the units are
> deployed.** The channel plan is an annex to MC 04-08-2015, and the study may
> have to be registered as a short range device. If the channel moves, change
> `LORA_FREQ` in **both** `config.h` files to the same new frequency, on the
> same day.

**The transmit power is 8 dBm.** The band is limited to 10 mW ERP, and ERP is
referenced to a half-wave dipole, so 8 dBm at the radio's connector — 6.3 mW,
about 6.1 mW ERP with a 2 dBi whip — keeps the radiated power under the
ceiling with roughly 2 dB to spare. Do not raise it to get more range: the
ceiling is a legal limit, not a target. Runbook §4.3 has the working.

## The pins that catch people out

| Signal | GPIO | Note |
| --- | --- | --- |
| LoRa DIO0 | 2 | The radio drives this line. **Do not put the status LED here.** |
| Status LED (ferry unit) | 4 | Free on this board. A LED on GPIO 2 fights the radio |
| GPS RX / TX | 16 / 17 | ESP32 UART2 |
| OLED SDA / SCL (port station) | 21 / 22 | I2C |

## What the port station does when things go wrong

The board is the only part of the system that talks to the PC, so it is where
the field problems land. It handles four of them on its own:

1. **The Wi-Fi drops.** It gets the network back instead of giving up on the
   boat for good. The boat keeps sending either way.
2. **The PC cannot be reached.** The radio is still read every time round, and
   the newest position replaces the one that was waiting, so the boat is where
   it is now and not where it was.
3. **The boat's packet numbers are behind the PC's.** The PC answers
   `{"stored":false, ..., "lastSeq":N}`. The board works out the difference
   between N and the boat's own number, adds that difference to every packet
   from that boat from then on, and sends it again. The difference stays the
   same, so the gaps in the boat's own numbering — the ones that show how many
   packets were lost on the way — are still there, and the packet success rate
   on the console still means something.
4. **The key is wrong, or the boat is unknown.** The board says which one it
   is (`Check the key` / `Check the boat id`) instead of quietly dropping the
   packet.

The boat's own counter does not have to be set above the number on the console
any more. A unit that was re-flashed, or one that starts at 1 while the PC
already has a high number, still works. Setting `FERRY_SEQ_START` above the
number on the card is still the tidier way to do it.

## Order of work

The runbook has the whole procedure, step by step, with every command and
every click: **`RUNBOOK.md` §4.1**. This is the same order in short.

| Part | What happens | Runbook |
| --- | --- | --- |
| **A** | The PC, with nothing plugged in: database, console, firewall, a packet sent by hand | §4.1 A1–A8 |
| **B** | The two boards on a bench: libraries, settings, wiring, flashing | §4.1 B1–B11 |
| **C** | The port station on the network: Wi-Fi, one packet all the way to the PC | §4.1 C1–C4 |
| **D** | The boat on the water: enclosure, power, the route | §4.1 D1–D3 |
| **E** | The live preview: the console, the passenger website, the timing | §4.1 E1–E4 |

The one command that proves the PC is ready for the port station:

```powershell
Set-Location C:\freery
node .\.briefs\send-test-packet.mjs
```

It sends exactly the packet the port station sends, with the same header and
the same body, and it reads the device key out of `apps/admin/.env.local`
without printing it. The last line has to be
`OK - the route took the packet. The PC is ready for the port station.`

It also takes care of the packet number: if the PC says it has already seen a
higher number, the script sends the packet again with the next one, which is
what the port station does with the same answer.

Flash the port station next — fill in the Wi-Fi name and password in
`secrets.h` first, and set `USE_DISPLAY 0` in `port_station/config.h` if there
is no OLED. Then flash a ferry unit with `FERRY_ID` set to that boat's id.

Outdoors, with a clear view of the sky, the ferry's monitor should print
`F1,14.2851,121.4123,18.5,1042` every 7 seconds. The port station should
print the packet with the RSSI and the SNR, and what the PC answered:
`{"stored":true}`.

Then watch the result: the console's **Hardware** tab shows a new packet, and
the boat moves in the live fleet preview and on
<http://localhost:3000/#ferries> within five seconds.

## What each side is responsible for

The **ferry unit** has no internet access and no device key. It never talks
to the PC. It only sends the five numbers over the radio. It sends nothing at
all until the GPS is giving a **fresh** fix — a fix that is valid and less
than 15 seconds old — so a GPS that has stopped working cannot keep a boat
looking alive on the map.

The **port station** holds the Wi-Fi and the device key. It turns the radio
packet into JSON, adds the radio quality, and posts it. If the PC does not
take a packet, the port station works out why and offers it again — which is
safe, because the sequence number tells the PC it has already seen that
packet.

## What has been checked, and what has not

The units are **not fitted yet**. Nothing below has run on a board.

**Checked against the running PC.** The port station's logic was played
against the real `/api/ingest` route on this PC by
`C:\freery\.briefs\check-seq-sync.mjs`, which is a line-by-line copy of the
sketch's own code. It proved that:

- a fresh unit's first packet is taken straight away;
- a unit that was re-flashed and whose counter went back to 1 is **not** lost —
  the board works out the difference and the packet is stored;
- the old firmware would have called that a success and dropped the packet,
  which is why the boat would have stopped moving with nothing looking wrong;
- the gaps in the boat's numbering survive the correction, so the packet
  success rate still tells the truth (4 packets over a span of 7 = 57%);
- the PC answers `400` for an unknown boat and `401` for a wrong key, and the
  board reads both;
- the PC answers on the address in `secrets.h`, and the port station can reach it.

**Checked by reading the library source.** The Arduino-LoRa and TinyGPSPlus
headers were read, and four calls that do not exist in those libraries were
found and fixed: `LoRa.setDIO0()`, `LoRa.setReset()`, the four-argument
`LoRa.setPins()`, and `gps.location.lon()` (the library spells it `lng()`). A
fifth was a wiring problem rather than a code one: the status LED was on
GPIO 2, which is the radio's DIO0 line. It is on GPIO 4 now.

**Not checked.** The sketches have never been **compiled**, because this PC has
no Arduino toolchain. Until they are compiled and flashed, a library API
detail that only shows up at compile time could still be waiting. Compile both
sketches before you rely on them.

Also still open, and listed in full in runbook §4.18: the **firewall rule is
not on this PC** (it needs a PowerShell window running as administrator), the
**Wi-Fi name and password are not filled in**, and the **LoRa channel still
needs the NTC's or the adviser's sign-off** even though 433.500 MHz is inside
the published band.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| `The radio did not start` | The wiring, or the two units do not agree on the radio settings |
| Nothing on the serial monitor of the port station | The two units are not hearing each other, or the frequency is wrong |
| `The PC refused the key. Check DEVICE_KEY in secrets.h.` | The device key in `secrets.h` is not the one in `apps/admin/.env.local` |
| `The PC refused the packet. Check the boat id.` | The boat id is not in the database, or a value is out of range |
| `no network` | The Wi-Fi name or password is wrong, or the PC's address changed (`ipconfig`) |
| `The PC has seen N from boat M. Adding K to its numbers.` | The PC was ahead of the boat's own counter. This is normal and self-correcting |
| `The PC did not take it` and the boat never moves | The PC refused the number for a reason the board could not read. Look for a `400` or a `401` in the same log |
| The packet is stored but the boat does not move | The position was projected onto the route and landed on the same station. Look at the Hardware tab for the raw coordinates |
