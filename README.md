# Freery — public web app

**LoRa-Based Ferry Tracking and Monitoring System Using GPS and ESP32**
Polytechnic University of the Philippines — Institute of Technology

This repository holds the part of Freery the passengers see, and the part that
feeds it. The front end and the back end are in **separate folders**, so you
can run, read and change each one on its own.

```
freery/
  frontend/    the passenger website   (Next.js, the page passengers open)
  backend/     the read-only API        (Express, the only thing that reads the database)
  database/    the tables, the views, the setup script
  hardware/    the ESP32 sketches: the ferry unit and the port station
```

---

## What each folder does

### `frontend/` — the passenger website

One page. It has the hero, the live ferry board, the stations and their
details, how it works, the questions and the contact section. The bar at the
top does not open another page — it scrolls you down to that part of the page.

The browser only ever calls this app's own routes, `/api/ferries` and
`/api/stations`. It never talks to the database and never sees the API secret.

It can also run on its own with **mock data**, so you can look at the whole
page without the hardware or the station PC. That is the default.

### `backend/` — the read-only API

A small Express server with three routes:

| Route | What it gives back |
| --- | --- |
| `GET /health` | Is the database reachable? |
| `GET /ferries` | Every ferry, with its position, speed, status, seats and colour |
| `GET /stations` | Every station, with its position, order, opening hours and notice |

It is **read only**. There is no write route here at all, and the database
account it uses can only read. Every request must carry the `x-api-secret`
header, and the secret is never sent to a browser.

### `database/` — the tables

The SQL files that build the schema, the views and the permissions, plus
`scripts/setup.mjs`, which creates the database and the three roles.

The role passwords are **generated** the first time the setup runs and kept in
`packages/database/.roles.json`, which is **not** in this repository. The
superuser password comes from the `PG_PASSWORD` environment variable.

### `hardware/` — the two boards

The firmware. `ferry_unit/` is the box on the boat: it reads the GPS and sends
the position over LoRa every seven seconds. `port_station/` is the box on
shore: it listens, and forwards what it hears to the PC over the network.

`hardware/README.md` explains the wiring and the radio settings.

---

## Running it

### 1. The database

The database is **Neon**, a PostgreSQL in the cloud. There is nothing to
install and no server to start. Put your connection strings in a `.env.local`
file at the top of the repository:

```
DATABASE_URL=postgresql://<user>:<password>@<neon-pooler-host>/<database>
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<neon-host>/<database>
```

The pooled address is for the apps. The direct one is for the setup, because a
pooled address cannot carry a schema change. Then:

```powershell
Set-Location database
node scripts/setup.mjs
```

It creates the tables, the views, the permissions and the example data, and it
prints the admin login it made.

> **The seed empties the tables first.** `004_seed.sql` truncates the stations,
> the ferries, the accounts, the passenger events and the GPS log before it puts
> the example data back.

### 2. The back end

Create `backend/.env.local`:

```
PORT=4000
DATABASE_URL=postgresql://freery_public:<the password>@<neon-pooler-host>/<database>
API_SECRET=<a long random string>
```

Then:

```powershell
Set-Location backend
npm install
npm start
```

**Check:** it prints `Freery read-only API listening on http://127.0.0.1:4000`.

### 3. The front end

Create `frontend/.env.local` — copy `frontend/.env.example` and fill it in:

```
USE_MOCK=false
PC_API_URL=http://127.0.0.1:4000
API_SECRET=<the same secret as the back end>
NEXT_PUBLIC_POLL_MS=5000
NEXT_PUBLIC_STALE_SECONDS=60
NEXT_PUBLIC_MOCK_TIME_SCALE=4
```

Then:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

**Check:** the ferries appear, and the page updates every five seconds.

Leave `USE_MOCK=true` and you do not need the back end or the database at all.

---

## The secrets, and where they live

**Nothing secret is in this repository.** These are the files that hold real
values, and none of them are committed:

| The file | What is in it | Where it goes instead |
| --- | --- | --- |
| `frontend/.env.local` | The API secret | Kept on your machine only |
| `backend/.env.local` | The API secret and the database password | Kept on your machine only |
| `hardware/port_station/secrets.h` | The Wi-Fi name, the Wi-Fi password and the device key | Kept on your machine only. `secrets.h.example` **is** committed, so you can see which values to fill in |
| `packages/database/.roles.json` | The three role passwords | Generated on your machine by the setup script |
| `.secrets/` | The admin login and the superuser password | Kept on your machine only |

`frontend/.env.example` and `hardware/port_station/secrets.h.example` are the
empty versions of those files, with the placeholders left in. They are the only
ones committed.

If you ever commit a real secret by accident, **rotating it is the fix**, not
deleting the file. A deleted file stays in the git history.

---

## What is not in this repository

- **The admin console** and the station app. They are the internal screens the
  staff use, and they live in their own repository.
- **The real data.** The ferries and the stations in the database are example
  data so the page has something to show.

---

## How the data gets from the boat to the page

```
  the boat's GPS  →  LoRa radio  →  the port station  →  Wi-Fi  →  the PC
   a fix every 7 s    a second       reads the radio      a POST     stores it
                                                        the API    in the database
                                                            │
                                                            ▼
                                                  the passenger website
                                                     asks again every 5 s
```

The boat's unit sends a plain text packet over the radio. The port station
reads it, notes the strength and quality of the radio link, and posts the
same values to the PC as JSON. The back end reads the database and hands the
public rows to the front end. The front end asks again every five seconds, so
a packet that reached the PC is on the passenger's screen within about five
seconds.

---

## The stack

| Part | What it is |
| --- | --- |
| Front end | Next.js 15, React 19, Tailwind CSS, SWR, zod |
| Back end | Express, `pg` |
| Database | PostgreSQL 17, hosted on Neon |
| Firmware | Arduino IDE, ESP32, RA-02 (SX1278) LoRa, NEO-6M GPS |
