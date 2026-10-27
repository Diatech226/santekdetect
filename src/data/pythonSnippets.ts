export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
}

export const PYTHON_SNIPPETS: Snippet[] = [
  {
    id: 'stats-calc',
    title: 'Descriptive Statistics & Outlier Detection',
    description: 'Queries SQLite products and computes mean, standard deviation, and Z-scores using python statistics.',
    code: `import sqlite3
import statistics

conn = sqlite3.connect("app_data.db")
cursor = conn.cursor()
cursor.execute("SELECT title, price, stock FROM products")
items = cursor.fetchall()
conn.close()

prices = [item[1] for item in items]
mean_val = statistics.mean(prices)
stdev_val = statistics.stdev(prices) if len(prices) > 1 else 0

print(f"=== PYTHON STATISTICAL ANALYSIS ===")
print(f"Sample Size: {len(prices)} items")
print(f"Mean Price:  \${mean_val:.2f}")
print(f"Std Dev:     \${stdev_val:.2f}")
print("--- Z-Scores & Price Outliers ---")

for title, price, stock in items:
    z_score = (price - mean_val) / stdev_val if stdev_val else 0
    tag = " [HIGH OUTLIER]" if z_score > 1.0 else (" [BARGAIN]" if z_score < -0.8 else "")
    print(f"{title[:28]:<30} | \${price:>8.2f} | Z={z_score:>+5.2f}{tag}")
`
  },
  {
    id: 'db-query',
    title: 'Live SQLite Inventory Audit',
    description: 'Runs SQL aggregation on inventory to summarize stock valuation grouped by hardware category.',
    code: `import sqlite3
import json

conn = sqlite3.connect("app_data.db")
cursor = conn.cursor()

query = """
SELECT 
    category,
    COUNT(*) as item_count,
    ROUND(AVG(price), 2) as avg_price,
    SUM(stock) as total_units,
    ROUND(SUM(price * stock), 2) as category_value
FROM products
GROUP BY category
ORDER BY category_value DESC
"""

cursor.execute(query)
rows = cursor.fetchall()
conn.close()

print(f"{'Category':<15} | {'Count':<6} | {'Avg Price':<10} | {'Units':<6} | {'Valuation':<12}")
print("-" * 60)
for r in rows:
    print(f"{r[0]:<15} | {r[1]:<6} | \${r[2]:<9.2f} | {r[3]:<6} | \${r[4]:<11.2f}")
`
  },
  {
    id: 'hotlink-parser',
    title: 'HTML Hotlinked Image Parser',
    description: 'Demonstrates Python HTMLParser extracting img tags, domains, and validating image protocols.',
    code: `from html.parser import HTMLParser
import urllib.parse

sample_html = """
<div class="gallery">
  <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800" alt="Audio Rig" width="800" />
  <img src="https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800" alt="Studio Monitors" />
  <img src="http://insecure-cdn.org/sample.png" alt="Insecure image" />
</div>
"""

class ImageExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.tags.append(dict(attrs))

parser = ImageExtractor()
parser.feed(sample_html)

print(f"Extracted {len(parser.tags)} <img> tags via Python HTMLParser:")
for idx, tag in enumerate(parser.tags, 1):
    src = tag.get('src', '')
    parsed = urllib.parse.urlparse(src)
    is_secure = "SECURE (HTTPS)" if parsed.scheme == "https" else "INSECURE (HTTP)"
    print(f"[{idx}] Host: {parsed.netloc or 'relative'} | Alt: {tag.get('alt')} | {is_secure}")
    print(f"    URL: {src[:70]}...")
`
  },
  {
    id: 'telemetry-sim',
    title: 'Sine-Wave Signal & Load Simulation',
    description: 'Generates telemetry signal vectors using math.sin and harmonic frequencies for real-time graphs.',
    code: `import math

print("Generating 12-hour harmonic signal wave...")
print("Hour  | Signal Amp | Simulated Load | Graph Bar")
print("-" * 48)

for h in range(12):
    # Harmonic fundamental + 3rd harmonic
    rad = (h / 12) * 2 * math.pi
    signal = 50 + 40 * math.sin(rad) + 10 * math.sin(3 * rad)
    bar_length = int(signal / 3)
    bar = "█" * bar_length
    print(f"{h:02d}:00 | {signal:8.2f}Hz  | {signal*0.8:6.1f}%       | {bar}")
`
  }
];
