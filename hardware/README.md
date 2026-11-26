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
| `port_station/secrets.h` | `PC_BASE_URL` | `http://192.168.101.83:3001` — this PC's address on the Wi-Fi network. It changes when the PC joins another network; the console shows the current one |
| `port_station/secrets.h` | `DEVICE_KEY` | already filled in from `apps/admin/.env.local` (a secret, never shown on the display) |
| `port_station/secrets.h` | `STATION_ID` | `PS-1` — the name of this board on the PC. Each board at a station has its own |
| `port_station/secrets.h` | `SETUP_AP_PASSWORD` | `freery-setup` — the password of the board's own setup network |
| `port_station/secrets.h` | `WIFI_SSID` / `WIFI_PASS` | **not needed any more.** The network comes from the console, and the board remembers it. These two are only used once, for a board that has never been set up |
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

## The receiver's network, from the console

The port station's Wi-Fi name and password used to be two lines in
`secrets.h`, so changing the network meant opening the Arduino IDE and
flashing the board again. Now the network is given from the admin console on
the PC, and the board remembers it.

There are two ways to give the board a network.

### The usual way: from the console

This is the way to use. It works for every network change after the first one.

1. Start the admin console on the head station PC. Open
   `http://127.0.0.1:3001` and sign in as the head administrator.
   **Check:** the console opens and the overview page appears.

2. Click **Hardware** in the menu.
   **Check:** the page shows the card called *The receiver's network*.

3. In the card, pick the board from the **Board** list.
   **Check:** the box under the list says which network the board is on.

4. Type the name of the network in **Network name**. It is the name on the
   router, for example `PortStation-WiFi`.
   **Check:** the box holds the name, with no spaces at the front or the back.

5. Type the password in **Network password**. Leave it empty if the network has
   no password.
   **Check:** the dots appear in the box. The password is never shown again
   after this.

6. Click **Send to the board**.
   **Check:** a green line says *The board has been asked.*

7. Wait about five seconds. The board asks the PC every few seconds.
   **Check:** the card says the board is on the new network.

8. If the card says the board could not get on the network, check the name and
   the password in the router's own page and try again.
   **Check:** the card shows the board is still on the network it had before.

**What the console never does:** it never shows the password again. It is
written once, the board is given it once, and it is cleared from the database
as soon as the board has it.

### The first time: the board's own setup page

A board that has never been on any network cannot reach the PC, so the console
cannot reach it either. The board puts up a small network of its own so that a
phone can set it up. This is the only time the Arduino IDE is needed, and only
for this one step.

1. Give the board power and wait about half a minute.
   **Check:** the Serial Monitor shows `Freery-Setup`.

2. On a phone, join the Wi-Fi called **Freery-Setup**. The password is
   `SETUP_AP_PASSWORD` in `port_station/secrets.h`. It is `freery-setup` unless
   it was changed.
   **Check:** the phone says it is connected to `Freery-Setup`.

3. Open `http://192.168.4.1` in the phone's browser.
   **Check:** the page says *Freery port station* and asks for a network name.

4. Click **Find the networks** and pick the network from the list. Or type the
   name in.
   **Check:** the network name is in the box.

5. Type the password, then click **Save and connect**.
   **Check:** the page says *The board is on [name] now.*

6. Close the browser. The board keeps the network in its own memory, so it
   comes back on that network after a power cut.
   **Check:** the Serial Monitor says the board is on the network.

7. Open the console again. The board now appears in the **Board** list.
   **Check:** the card shows the board and the network it is on.

**If the board has a network but cannot reach the PC**, it puts the setup page
up by itself after about a minute and a half. That happens when the PC moves
to another network. Join `Freery-Setup` and open `http://192.168.4.1` again.

**To reach the setup page on purpose**, hold the button on GPIO 27 down while
the board starts. The pin is `SETUP_BUTTON_PIN` in `port_station/config.h`.

### What the board does with the network it is given

1. The board asks the PC every five seconds whether it has been given a
   different network.
2. The PC hands the new network over once. The password comes out of the
   database at that moment and is cleared.
3. The board tries the new network.
4. If it works, the board keeps it and tells the PC it is on it.
5. If it does not work, the board goes back to the network it already had and
   tells the PC it failed. That is why the board can still be reached to say so.

The board never sends the password of the network it is on. It only sends the
name.

### The files

| File | What it holds |
| --- | --- |
| `port_station/station_network.h` | The whole network side: the memory, the link to the PC, and the setup page |
| `port_station/config.h` | `SETUP_AP_NAME`, `SETUP_BUTTON_PIN`, `LINK_INTERVAL_MS`, `LINK_GRACE_MS`, `NEW_NETWORK_TIMEOUT_MS` |
| `port_station/secrets.h` | `STATION_ID` (the board's name on the PC), `SETUP_AP_PASSWORD`, `PC_BASE_URL`, `DEVICE_KEY` |
| `apps/admin/app/api/device/link/route.ts` | The route the board asks |
| `apps/admin/app/api/admin/receivers/route.ts` | The route the console uses |

## The console knows the network the PC is on

The console reads the Wi-Fi the head station PC is on, and offers it to the
board. Nothing has to be typed — not the name, and not the password.

This is **Windows only**. On another system the console says it does not know
the network, and the name and the password are typed in by hand, the way the
section above describes.

1. Start the admin console on the head station PC. Open
   `http://127.0.0.1:3001` and sign in as the head administrator.
   **Check:** the console opens.

2. Click **Hardware**.
   **Check:** the card called *The receiver's network* has a box above it called
   *This PC is on*.

3. Read that box. It shows the name of the network the PC is on, the address
   the PC has on it, and the signal.
   **Check:** for example `riricakes · 192.168.101.83 · signal 92%`.

4. Read the line under the box.
   **Check:** it says *This one is saved on the PC, so it can be left empty.*
   When Windows has not saved that network, the password has to be typed.

5. Click **Use this network**. The name goes into the network box.
   **Check:** the box holds the same name.

6. **Leave the password box empty.**
   **Check:** the password box is empty.

7. Pick the board in the **Board** list, then click **Send to the board**.
   **Check:** a green line says *The board has been asked.*

8. Wait about five seconds.
   **Check:** the card says the board is on the network, with its address.

### Where the password comes from

The console asks Windows for the saved profile of that network. Windows hands
over the password, the console reads it out of the **XML** of the profile (the
names in that file are the same in every language, while the labels `netsh`
prints are translated), and the password goes **straight** into the request for
the board.

The password never reaches the browser and is never printed. The console only
ever says **whether** the password is saved — one yes or no, which cannot leak
anything. The board is given the password once, and it is cleared from the
database as soon as the board has it.

The whole chain is checked by `C:\freery\.briefs\check-pc-network.mjs`.

```powershell
Set-Location C:\freery; node .briefs\check-pc-network.mjs
```

**Check:** it ends with `17 passed, 0 failed`.

### Every network in range, not only the one the PC is on

The console scans for the networks around the head station PC and lists **all**
of them, whether Windows has them saved or not. The board can be put on any of
them.

1. Start the admin console on the head station PC. Open
   `http://127.0.0.1:3001` and sign in as the head administrator.
   **Check:** the console opens.

2. Click **Hardware**, and wait for the box called **Networks in range**.
   **Check:** the button says *Looking...* and then the networks appear. It
   takes about five seconds the first time. After that the list is already
   there.

3. Read the list. Each line has the name of the network, the band, the signal,
   and either *The password is saved on this PC* or *The password has to be
   typed.*
   **Check:** the network the PC is on is at the top, marked *this PC is on it*.

4. Click **Use** on the network you want.
   **Check:** the name goes into the **Network name** box, and a line says
   whether the password has to be typed.

5. Type the password when the list says it has to be typed. Leave it empty when
   the list says the password is saved on the PC.
   **Check:** the hint under the password box agrees with the list.

6. Click **Send to the board**, and wait about five seconds.
   **Check:** the card says the board is on the new network, with its address.

**The 2.4 GHz rule.** The board's Wi-Fi is **2.4 GHz only**. A network that is
in range on 5 GHz cannot be used, so the console says so, and it will not send
one to the board. A router that puts out both is fine — the board uses the
2.4 GHz one.

**When the list shows only one network**, the scan had not finished. Windows
answers with the network the PC is on until it does. Leave the adapter alone
for a minute and press **Look again** once. The console keeps the longer list
it already has, so a short answer never replaces a good one.

The whole chain is checked by
`C:\freery\.briefs\check-nearby-networks.mjs`, which also checks the parser
against a captured scan in `C:\freery\.briefs\fixtures\`, with no adapter
needed.

```powershell
Set-Location C:\freery; node --experimental-strip-types .briefs\check-nearby-networks.mjs
```

**Check:** it ends with `26 passed, 0 failed`.

### The PC's own address still moves
The console gives the board a **network**. It does not give the board the
**PC's address**, because that address is in `PC_BASE_URL` in `secrets.h`. When
the PC joins another network, the address changes, and the board has to be
flashed again with the new one.

The fix that removes this for good is a **DHCP reservation** on the router. It
pins the address, and the board never has to be flashed for a network change
again. The console always shows the current address on the *This PC is on* card,
so the value to put in `PC_BASE_URL` is never a guess.

### Only the head administrator sees this

The card is on the **Hardware** page of the head station console, and the route
behind it refuses anybody who is not the head administrator — on **both**
processes. The counter app on port 3002 shares several `/api/admin/` routes
with the console on purpose, so a route that is about the head station checks
the role itself instead of relying on the middleware.

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

Flash the port station next — check that `PC_BASE_URL` in `secrets.h` holds the
PC's current address (the console shows it on the *This PC is on* card, and
`ipconfig` shows it too), and set `USE_DISPLAY 0` in `port_station/config.h` if
there is no OLED. The Wi-Fi name and password do **not** have to be filled in —
the network comes from the console. Then flash a ferry unit with `FERRY_ID` set
to that boat's id.

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
- the PC answers on `192.168.101.83:3001`, the address in `secrets.h`.

**Checked by reading the library source.** The Arduino-LoRa and TinyGPSPlus
headers were read, and four calls that do not exist in those libraries were
found and fixed: `LoRa.setDIO0()`, `LoRa.setReset()`, the four-argument
`LoRa.setPins()`, and `gps.location.lon()` (the library spells it `lng()`). A
fifth was a wiring problem rather than a code one: the status LED was on
GPIO 2, which is the radio's DIO0 line. It is on GPIO 4 now.

**Checked by compiling.** `C:\freery\.briefs\check-firmware-compiles.mjs`
compiles both sketches on this PC with the C++ compiler that came with Visual
Studio, against stand-ins for the Arduino libraries in
`C:\freery\.briefs\arduino-stubs`. The stand-ins copy the shape of the real
headers, so a call that does not exist is caught the same way it would be in
the Arduino IDE. The port station is compiled twice, once with the display
fitted and once without it. All three passes are clean, with no errors and no
warnings.

```powershell
Set-Location C:\freery; node .briefs\check-firmware-compiles.mjs
```

**Checked by compiling against the real board package.** The real toolchain is
now on this PC, so both sketches were compiled against it, not only against
the stand-ins. The board package is `esp32:esp32` 3.3.12, and `arduino-cli`
1.6.0 is at `C:\freery\.tools\arduino-cli\arduino-cli.exe`.

```powershell
Set-Location C:\freery
& C:\freery\.tools\arduino-cli\arduino-cli.exe compile --fqbn esp32:esp32:esp32 C:\freery\hardware\port_station
& C:\freery\.tools\arduino-cli\arduino-cli.exe compile --fqbn esp32:esp32:esp32 C:\freery\hardware\ferry_unit
```

The port station takes 86% of the flash and the ferry unit 21%. The only
warnings are two deprecation notices from the LoRa library itself.

**That first compile found three real bugs** that the stand-in headers could
not see, because there was no real header for them to disagree with:

1. The port station's own file was called `network.h`, and the ESP32 board
   package has a library header called `Network.h`. The sketch folder is
   searched first, so the Wi-Fi library read the port station's file instead of
   its own. The file is called **`station_network.h`** now, and
   `check-firmware-compiles.mjs` fails if any sketch file has the same name as
   a board package header.
2. `apDns.processNextDnsRequest()` does not exist in core 3.x. The method is
   `processNextRequest()`.
3. `ensureConnected()` was private, and the sketch calls it before it posts
   anything.

**The board has a network.** `secrets.h` no longer holds the placeholder
`your-router-name`. It holds the network this PC is on, so a board flashed
today joins the Wi-Fi as it starts. `C:\freery\.briefs\set-sketch-network.mjs`
puts it there from the Windows saved profile. The password is never printed,
and `secrets.h` is listed in `hardware/.gitignore`.

**Flashing is one command.**

```powershell
Set-Location C:\freery; node .briefs\flash-board.mjs
```

It finds the board's port, compiles, flashes, watches the board talk for 45
seconds, and then checks that the PC saw the board report in. If nothing is
plugged in it stops at the first step and says so, instead of failing later
with a confusing message.

**The board says three things about itself.** `connected` — it is on a network.
`failed` — it tried a network and was turned away. `setup` — it has no network
to try at all. The `failed` case was unreachable until 23 Nov 2026: the boot
code set the status and then overwrote it on the way out. It survives now, and
the console's line for it says the board is putting up its setup page, because
that is the way back.

**Not checked.** The sketches have still never been **flashed**, and no board
has ever been **run**. Compiling on a PC is not the same as running on a
board: the radio, the GPS and the Wi-Fi have not been exercised, and the
setup page has not been opened in a browser. **No board is connected to this
PC** — `arduino-cli board list` says `No boards found`, and Windows lists no
ports at all. Runbook **§4.15a** is the procedure for when one is.

Also still open, and listed in full in runbook §4.18: the **firewall rule is
not on this PC** (it needs a PowerShell window running as administrator), the
**board has never been set up on a network** (its own setup page has not been
opened yet), and the **LoRa channel still needs the NTC's or the adviser's
sign-off** even though 433.500 MHz is inside the published band.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| `The radio did not start` | The wiring, or the two units do not agree on the radio settings |
| Nothing on the serial monitor of the port station | The two units are not hearing each other, or the frequency is wrong |
| `The PC refused the key. Check DEVICE_KEY in secrets.h.` | The device key in `secrets.h` is not the one in `apps/admin/.env.local` |
| `The PC refused the packet. Check the boat id.` | The boat id is not in the database, or a value is out of range |
| `no network` | The Wi-Fi name or password is wrong, or the PC's address changed (`ipconfig`) |
| `The PC gave a new network: [name]` | The console asked the board to use a different network. The board is trying it now |
| `It could not get on [name].` on the serial monitor | The board tried the network the console gave it and could not get on it. It goes back to the network it had |
| `The PC did not answer the link (code).` | The board cannot reach the PC. Check the PC's address in `secrets.h` and the firewall rule |
| `The setup page is up on 192.168.4.1.` | The board has no network, or it cannot reach the PC. Join `Freery-Setup` and open `http://192.168.4.1` |
| The console says *Waiting for someone to set its network* | The board is running its own setup page. Open it with a phone |
| The console says *Could not get on the network it was given* | The network name or the password in the console is wrong |
| The board is not in the console's **Board** list | The board has never reached the PC. It has to be set up once from its own setup page |
| The *This PC is on* box has no network name | The PC is on a cable, or on a network Windows will not name. Connect the PC to the Wi-Fi the board should use |
| The console says the password is not saved on the PC | Windows has no saved profile for that network. Type the password in by hand, or connect the PC to that Wi-Fi once so Windows saves it |
| The board could not get on the network it was given | The name or the password is wrong. Check them in the router's own page and send them again |
| The **Networks in range** list shows only one network | The scan had not finished. Windows answers with the network the PC is on until it does. Leave the adapter alone for a minute, then press **Look again** once |
| A network in the list says 5 GHz | The board's Wi-Fi is 2.4 GHz only. It cannot be used |
| The board is on the right network but the PC cannot be reached | The PC's address changed. `ipconfig`, then change `PC_BASE_URL` in `secrets.h` and flash again. A DHCP reservation on the router stops this for good |
| `The PC has seen N from boat M. Adding K to its numbers.` | The PC was ahead of the boat's own counter. This is normal and self-correcting |
| `The PC did not take it` and the boat never moves | The PC refused the number for a reason the board could not read. Look for a `400` or a `401` in the same log |
| The packet is stored but the boat does not move | The position was projected onto the route and landed on the same station. Look at the Hardware tab for the raw coordinates |
