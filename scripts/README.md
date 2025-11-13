# Anime Oracles – Pyth + CoinMarketCap Price Fetcher

This project fetches the **ANIME/USD stable feed** price from **Pyth Network (Hermes API)** and the **ANIME/USD market price** from **CoinMarketCap (CMC)**.  
The results are printed to the terminal in a clean table format, updating every **5 minutes** until stopped.

---

## Features
- Fetches **on-chain oracle price** from Pyth Hermes `/v2/updates/price/latest`.
- Fetches **market price** from CoinMarketCap `quotes/latest`.
- Prints results as a table in the terminal.
- Table header is printed only once; subsequent rows are appended below.
- Runs continuously, querying every 5 minutes.

---

## Requirements
- Python 3.9+
- The following Python packages:
  - `requests`
  - `schedule`
  - `python-dotenv`

---

## Installation

1. (Optional but recommended) create and activate a virtual environment:

   **Windows (PowerShell):**
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

   **Linux / macOS:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install requests schedule python-dotenv
   ```

---

## Running the Script

```bash
python anime_oracles.py
```

- Fetches data immediately at startup.
- Then fetches again every 5 minutes.
- Output looks like this:

```
| timestamp           |    Pyth_Stable |       Pyth_EMA | Pyth_publish_time |  CMC_price_USD |
|---------------------|----------------|----------------|----------------|----------------|
| 2025-09-09 20:06:57 |     0.01573594 |     0.01568627 |     1757437614 |     0.01570607 |
| 2025-09-09 20:08:00 |     0.01572555 |     0.01568717 |     1757437678 |     0.01570591 |
```

---

## Stopping the Script

To stop execution, press:
```
CTRL + C
```

---

## Notes
- **Pyth price** is calculated using `price * 10^expo`.
- **CMC price** is quoted directly in USD.
- Expect small differences between oracle feed price (Pyth) and market price (CMC).
