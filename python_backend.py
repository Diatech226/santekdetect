#!/usr/bin/env python3
"""
Python Backend Service for PyScreen Studio.
Provides data processing, SQLite management, HTML image hotlink inspection,
and Python script execution.
"""
import sys
import os
import json
import time
import sqlite3
import urllib.request
import urllib.parse
from html.parser import HTMLParser
import statistics
import math
import traceback
import subprocess

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_data.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Inventory & Showcase Products
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            rating REAL NOT NULL,
            image_url TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active'
        )
    """)

    # Analytics metrics & log entries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT
        )
    """)

    # Check if empty, seed default realistic items with high-res hotlinked images
    cursor.execute("SELECT COUNT(*) FROM products")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_products = [
            (
                "Neural Synthesizer Mk-IV",
                "Hardware",
                1299.00,
                14,
                4.9,
                "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
                "Advanced analog-digital hybrid synthesizer powered by dual DSP cores and tactile OLED dials.",
                "active"
            ),
            (
                "AeroStudio Acoustic Monitors",
                "Hardware",
                849.50,
                22,
                4.8,
                "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80",
                "Calibrated near-field studio monitors featuring beryllium ribbon tweeters and carbon woofers.",
                "active"
            ),
            (
                "Spectra Optical Sensor Probe",
                "Instruments",
                420.00,
                38,
                4.7,
                "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
                "High-precision laser interferometry sensor for automated sub-micron surface inspection.",
                "active"
            ),
            (
                "Quantum Flux Interface Rack",
                "Hardware",
                2150.00,
                8,
                5.0,
                "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
                "Modular 19-inch telemetry rack with 32-channel isolated DACs and gigabit fiber uplinks.",
                "active"
            ),
            (
                "Helix Ergonomic Control Deck",
                "Peripherals",
                340.00,
                45,
                4.6,
                "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
                "Machined aluminum macro pad with motorized rotary encoders and haptic feedback.",
                "active"
            ),
            (
                "ChronoData Log Server",
                "Servers",
                3800.00,
                5,
                4.9,
                "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
                "Ultra-low latency time-series appliance for industrial telemetry ingest and real-time indexing.",
                "active"
            )
        ]
        cursor.executemany("""
            INSERT INTO products (title, category, price, stock, rating, image_url, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_products)

        seed_logs = [
            ("throughput_mbps", 845.2, "Peak ingest traffic"),
            ("cpu_utilization_pct", 42.6, "Normal operating load"),
            ("api_latency_ms", 14.8, "Sub-20ms target achieved"),
            ("memory_active_mb", 1024.0, "Worker pool stabilized"),
            ("cache_hit_rate_pct", 94.3, "Redis L2 cache warm")
        ]
        cursor.executemany("""
            INSERT INTO analytics_logs (metric_name, metric_value, notes)
            VALUES (?, ?, ?)
        """, seed_logs)

        conn.commit()
    conn.close()

class HTMLImageExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'img':
            attr_dict = dict(attrs)
            src = attr_dict.get('src', '').strip()
            if src:
                self.images.append({
                    "src": src,
                    "alt": attr_dict.get('alt', 'Image'),
                    "width": attr_dict.get('width', ''),
                    "height": attr_dict.get('height', ''),
                    "className": attr_dict.get('class', ''),
                    "loading": attr_dict.get('loading', 'eager')
                })

def analyze_html_images(html_content):
    parser = HTMLImageExtractor()
    parser.feed(html_content)
    extracted = parser.images
    
    total = len(extracted)
    domains = {}
    secure_count = 0
    
    for img in extracted:
        src = img['src']
        if src.startswith('https://'):
            secure_count += 1
        parsed = urllib.parse.urlparse(src)
        domain = parsed.netloc or 'relative/inline'
        domains[domain] = domains.get(domain, 0) + 1
        img['domain'] = domain
        img['is_secure'] = src.startswith('https://')

    return {
        "total_images": total,
        "images": extracted,
        "secure_ratio": round((secure_count / total * 100) if total > 0 else 100, 1),
        "unique_domains": list(domains.keys()),
        "domain_distribution": domains
    }

def compute_data_metrics():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    prices = [r['price'] for r in rows] if rows else [0]
    stocks = [r['stock'] for r in rows] if rows else [0]
    ratings = [r['rating'] for r in rows] if rows else [0]

    mean_price = statistics.mean(prices)
    median_price = statistics.median(prices)
    stdev_price = statistics.stdev(prices) if len(prices) > 1 else 0
    total_inventory_value = sum(r['price'] * r['stock'] for r in rows)
    total_stock_units = sum(stocks)

    # Categories count
    cat_counts = {}
    for r in rows:
        cat = r['category']
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # Synthetic 24-hour simulation trend using python math
    trend_24h = []
    base_val = 142.0
    for hour in range(24):
        # Realistic sinusoidal diurnal curve with slight noise
        time_factor = math.sin((hour - 8) * math.pi / 12)
        val = base_val + (time_factor * 28.5) + (math.cos(hour * 0.7) * 4.2)
        trend_24h.append({
            "hour": f"{hour:02d}:00",
            "traffic": round(val, 1),
            "conversions": round(val * 0.18, 1),
            "server_load_pct": round(min(98.0, max(12.0, 35 + time_factor * 25)), 1)
        })

    return {
        "products": rows,
        "product_count": len(rows),
        "stats": {
            "mean_price": round(mean_price, 2),
            "median_price": round(median_price, 2),
            "stdev_price": round(stdev_price, 2),
            "total_inventory_value": round(total_inventory_value, 2),
            "total_stock_units": total_stock_units,
            "average_rating": round(statistics.mean(ratings), 2) if ratings else 0.0,
            "category_distribution": cat_counts
        },
        "simulation_trend": trend_24h
    }

def execute_user_python(code_snippet):
    start_time = time.time()
    try:
        # Run python code via subprocess with strict timeout
        result = subprocess.run(
            [sys.executable, "-c", code_snippet],
            capture_output=True,
            text=True,
            timeout=6.0
        )
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
            "execution_time_ms": duration_ms
        }
    except subprocess.TimeoutExpired:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "stdout": "",
            "stderr": "Execution timed out after 6.0 seconds.",
            "return_code": -1,
            "execution_time_ms": duration_ms
        }
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "stdout": "",
            "stderr": traceback.format_exc(),
            "return_code": 1,
            "execution_time_ms": duration_ms
        }

def add_product(item):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO products (title, category, price, stock, rating, image_url, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item.get('title', 'Untitled Item'),
        item.get('category', 'General'),
        float(item.get('price', 99.0)),
        int(item.get('stock', 10)),
        float(item.get('rating', 5.0)),
        item.get('image_url', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'),
        item.get('description', ''),
        item.get('status', 'active')
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": new_id, "success": True}

def delete_product(product_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": product_id}

if __name__ == "__main__":
    init_db()
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "status":
            info = {
                "python_version": sys.version,
                "executable": sys.executable,
                "platform": sys.platform,
                "sqlite_version": sqlite3.sqlite_version,
                "db_path": DB_PATH,
                "db_exists": os.path.exists(DB_PATH)
            }
            print(json.dumps(info))
        elif cmd == "metrics":
            print(json.dumps(compute_data_metrics()))
        elif cmd == "analyze_html":
            input_data = sys.stdin.read()
            print(json.dumps(analyze_html_images(input_data)))
        elif cmd == "run_code":
            input_code = sys.stdin.read()
            print(json.dumps(execute_user_python(input_code)))
        elif cmd == "add_product":
            input_json = json.loads(sys.stdin.read())
            print(json.dumps(add_product(input_json)))
        elif cmd == "delete_product":
            pid = int(sys.argv[2])
            print(json.dumps(delete_product(pid)))
        else:
            print(json.dumps({"error": f"Unknown command {cmd}"}))
    else:
        print(json.dumps({"status": "ready", "version": sys.version}))
