export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  image_url: string;
  description: string;
  status: string;
}

export interface MetricStats {
  mean_price: number;
  median_price: number;
  stdev_price: number;
  total_inventory_value: number;
  total_stock_units: number;
  average_rating: number;
  category_distribution: Record<string, number>;
}

export interface TelemetryPoint {
  hour: string;
  traffic: number;
  conversions: number;
  server_load_pct: number;
}

export interface PythonBackendStatus {
  success: boolean;
  backend: string;
  python_version: string;
  executable: string;
  platform: string;
  sqlite_version: string;
  db_path: string;
  db_exists: boolean;
}

export interface PythonRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  return_code: number;
  execution_time_ms: number;
}

export interface ExtractedImage {
  src: string;
  alt: string;
  width?: string;
  height?: string;
  className?: string;
  loading?: string;
  domain: string;
  is_secure: boolean;
}

export interface HTMLAnalysisResult {
  total_images: number;
  images: ExtractedImage[];
  secure_ratio: number;
  unique_domains: string[];
  domain_distribution: Record<string, number>;
}
