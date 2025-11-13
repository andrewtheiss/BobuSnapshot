# file: anime_pyth_cmc_loop_fixed.py
import os
import time
import requests
import schedule
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ---- Config ----
PYTH_URL = "https://hermes.pyth.network/v2/updates/price/latest"
PYTH_STABLE_ID = "45b75908a1965a86080a26d9f31ab69d045d4dda73d1394e0d3693ce00d40e6f"

CMC_URL = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest"
CMC_API_KEY = os.getenv("CMC_API_KEY", "")
CMC_SYMBOL = "ANIME"

TIMEOUT = 10
UA = {"Accept": "application/json", "User-Agent": "anime-pyth-cmc/fixed-1.0"}

# ---- Fixed column spec (name, width, align) ----
# timestamp is 19 chars (YYYY-MM-DD HH:MM:SS)
COLS = [
    ("timestamp",          19, "<"),  # left
    ("Pyth_Stable",        14, ">"),  # right
    ("Pyth_EMA",           14, ">"),
    ("Pyth_publish_time",  14, ">"),
    ("CMC_price_USD",      14, ">"),
]

header_printed = False


def _fmt(v):
    try:
        f = float(v)
        # 8 ondalık, kuyruğu kırp
        s = f"{f:.8f}".rstrip("0").rstrip(".")
        return s
    except:
        return "NA"


def _ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def fetch_pyth_stable(feed_id: str):
    try:
        r = requests.get(PYTH_URL, params=[("ids[]", feed_id)], headers=UA, timeout=TIMEOUT)
        r.raise_for_status()
        j = r.json()
        parsed = j.get("parsed", [])
        if not parsed:
            return None, None, None
        item = parsed[0]
        p = item.get("price", {}) or {}
        ep = item.get("ema_price", {}) or {}
        price_raw, expo = p.get("price"), p.get("expo")
        ema_raw, ema_expo = ep.get("price"), ep.get("expo")
        pub_time = p.get("publish_time")
        price = float(price_raw) * (10 ** int(expo)) if price_raw is not None and expo is not None else None
        ema = float(ema_raw) * (10 ** int(ema_expo)) if ema_raw is not None and ema_expo is not None else None
        return price, ema, pub_time
    except:
        return None, None, None


def fetch_cmc_price(symbol: str):
    if not CMC_API_KEY:
        return None
    try:
        r = requests.get(
            CMC_URL,
            params={"symbol": symbol, "convert": "USD"},
            headers={"X-CMC_PRO_API_KEY": CMC_API_KEY, **UA},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        j = r.json()
        arr = j.get("data", {}).get(symbol)
        if isinstance(arr, list) and arr:
            price = arr[0].get("quote", {}).get("USD", {}).get("price")
            return float(price) if price is not None else None
        return None
    except:
        return None


def print_header():
    # | col1 | col2 | ...
    parts = []
    for name, width, align in COLS:
        parts.append(f" {name:{align}{width}} ")
    line = "|" + "|".join(parts) + "|"
    print(line)
    # separator
    sep_parts = []
    for _, width, _ in COLS:
        sep_parts.append("-" * (width + 2))
    print("|" + "|".join(sep_parts) + "|")


def print_row(row_dict):
    parts = []
    for name, width, align in COLS:
        val = str(row_dict.get(name, ""))
        parts.append(f" {val:{align}{width}} ")
    print("|" + "|".join(parts) + "|", flush=True)


def job():
    global header_printed
    pyth_price, pyth_ema, pyth_pub = fetch_pyth_stable(PYTH_STABLE_ID)
    cmc_price = fetch_cmc_price(CMC_SYMBOL)

    row = {
        "timestamp": _ts(),
        "Pyth_Stable": _fmt(pyth_price),
        "Pyth_EMA": _fmt(pyth_ema),
        "Pyth_publish_time": pyth_pub if pyth_pub is not None else "NA",
        "CMC_price_USD": _fmt(cmc_price),
    }

    if not header_printed:
        print_header()
        header_printed = True
    print_row(row)


def main():
    job()  # immediate
    schedule.every(5).minutes.do(job)
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
