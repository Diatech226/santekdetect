import React, { useState } from 'react';
import { X, Plus, Sparkles, Image as ImageIcon } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: {
    title: string;
    category: string;
    price: number;
    stock: number;
    rating: number;
    image_url: string;
    description: string;
  }) => Promise<void>;
}

const PRESET_HOTLINKS = [
  {
    name: 'Modular Synthesizer',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    category: 'Hardware',
    price: 1350
  },
  {
    name: 'Laser Precision Probe',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    category: 'Instruments',
    price: 490
  },
  {
    name: 'Tactile Audio Mixer',
    url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    category: 'Hardware',
    price: 920
  },
  {
    name: 'Industrial Telemetry Rack',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    category: 'Servers',
    price: 3200
  }
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [price, setPrice] = useState(799.0);
  const [stock, setStock] = useState(15);
  const [imageUrl, setImageUrl] = useState(PRESET_HOTLINKS[0].url);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddProduct({
        title,
        category,
        price: Number(price),
        stock: Number(stock),
        rating: 4.8,
        image_url: imageUrl,
        description,
      });
      onClose();
      setTitle('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Deploy New Hardware Item
            </h3>
            <p className="text-xs text-slate-400">
              Saves directly into the Python SQLite database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Title / Device Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Apex Frequency Modulator X1"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="Hardware">Hardware</option>
                <option value="Instruments">Instruments</option>
                <option value="Peripherals">Peripherals</option>
                <option value="Servers">Servers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Stock
              </label>
              <input
                type="number"
                min="1"
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Hotlinked Image URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono text-slate-300">
                Hotlinked Image URL
              </label>
              <span className="text-[10px] text-teal-400">
                Direct external link
              </span>
            </div>
            <input
              type="url"
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />

            {/* Quick hotlink selector */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500">Preset visuals:</span>
              {PRESET_HOTLINKS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setImageUrl(preset.url);
                    if (!title) setTitle(preset.name);
                    setCategory(preset.category);
                    setPrice(preset.price);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="relative aspect-[16/7] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-sm text-[10px] font-mono text-emerald-400 rounded">
                Hotlink Active
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specifications or instrument details..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving to SQLite...' : 'Save to SQLite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
