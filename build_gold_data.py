import json
import pandas as pd
import yfinance as yf
from datetime import datetime, timezone, timedelta

TICKER = "GC=F"
PERIOD = "6mo"
INTERVAL = "1d"
OUT_FILE = "gold_data.json"

def now_cn_str():
    tz = timezone(timedelta(hours=8))
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

with open(OUT_FILE, "r", encoding="utf-8") as f:
    base = json.load(f)

df = yf.download(TICKER, period=PERIOD, interval=INTERVAL, auto_adjust=False)

# flatten MultiIndex columns if any
if isinstance(df.columns, pd.MultiIndex):
    df.columns = df.columns.get_level_values(0)

df = df.dropna().reset_index()

date_col = "Date" if "Date" in df.columns else ("Datetime" if "Datetime" in df.columns else None)
if date_col is None:
    raise ValueError(f"No date column, columns={list(df.columns)}")

df["date"] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")

for c in ["Open", "High", "Low", "Close"]:
    df[c] = pd.to_numeric(df[c], errors="coerce")
if "Volume" in df.columns:
    df["Volume"] = pd.to_numeric(df["Volume"], errors="coerce")

df = df.dropna(subset=["Open", "High", "Low", "Close"])

rows = []
for _, r in df.iterrows():
    rows.append({
        "date": r["date"],
        "open": float(r["Open"]),
        "high": float(r["High"]),
        "low": float(r["Low"]),
        "close": float(r["Close"]),
        "volume": (float(r["Volume"]) if "Volume" in df.columns and pd.notna(r["Volume"]) else None)
    })

base.setdefault("meta", {})
base["meta"]["symbol"] = TICKER
base["meta"]["updated_at"] = now_cn_str()
base["meta"]["trade_date"] = rows[-1]["date"] if rows else ""

base["market"] = {
    "source": "yfinance",
    "symbol": TICKER,
    "rows": rows
}

base.setdefault("provenance", {})
base["provenance"].setdefault("sources", [])
srcs = [str(s).lower() for s in base["provenance"]["sources"]]
if "yfinance" not in srcs:
    base["provenance"]["sources"].append("yfinance")

with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(base, f, ensure_ascii=False, indent=2)

print("OK:", TICKER, "rows=", len(rows))
print("UPDATED_AT:", base["meta"].get("updated_at"))
