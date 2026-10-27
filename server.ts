import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper to interact with python_backend.py
function callPython(args: string[], stdinData?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [path.join(process.cwd(), 'python_backend.py'), ...args]);
    let stdout = '';
    let stderr = '';

    if (stdinData) {
      py.stdin.write(stdinData);
      py.stdin.end();
    }

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        resolve({ raw_stdout: stdout, raw_stderr: stderr, exit_code: code });
      }
    });

    py.on('error', (err) => {
      reject(err);
    });
  });
}

// Python status
app.get('/api/status', async (_req, res) => {
  try {
    const data = await callPython(['status']);
    res.json({ success: true, backend: 'python3', ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Computed Data Metrics & Products from SQLite
app.get('/api/metrics', async (_req, res) => {
  try {
    const data = await callPython(['metrics']);
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run Python script snippet
app.post('/api/python/run', async (req, res) => {
  try {
    const { code } = req.body;
    if (typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code must be a string' });
    }
    const result = await callPython(['run_code'], code);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze HTML & extract hotlinked images via Python html.parser
app.post('/api/analyze-html', async (req, res) => {
  try {
    const { html } = req.body;
    if (typeof html !== 'string') {
      return res.status(400).json({ success: false, error: 'HTML content required' });
    }
    const result = await callPython(['analyze_html'], html);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add product to SQLite database
app.post('/api/products', async (req, res) => {
  try {
    const product = req.body;
    const result = await callPython(['add_product'], JSON.stringify(product));
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product from SQLite database
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await callPython(['delete_product', id]);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Preset screen mockups with hotlinked images
app.get('/api/sample-screens', (_req, res) => {
  const screens = [
    {
      id: 'studio-hardware',
      name: 'Audio & DSP Hardware Hub',
      description: 'Tactile sound synthesis, analog modules & frequency monitors with hotlinked high-res visuals.',
      images: [
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'data-telemetry',
      name: 'Industrial Robotics & Telemetry',
      description: 'Precision optical inspection, edge sensors and automated robotic assembly units.',
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'quantum-lab',
      name: 'Quantum Optics & Research Lab',
      description: 'Spectroscopy lasers, cryogenic chambers and photon count sensors with live Python statistics.',
      images: [
        'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80'
      ]
    }
  ];
  res.json({ success: true, screens });
});

// Setup Vite middleware or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PyScreen Server] Running on http://0.0.0.0:${PORT} with Python 3 backend`);
  });
}

startServer().catch((err) => {
  console.error('[PyScreen Server Error]:', err);
  process.exit(1);
});
