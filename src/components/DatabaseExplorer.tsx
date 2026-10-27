import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  Search, 
  Star, 
  ExternalLink, 
  Plus, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';

interface DatabaseExplorerProps {
  products: Product[];
  onDeleteProduct: (id: number) => Promise<void>;
  onOpenAddModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  products,
  onDeleteProduct,
  onOpenAddModal,
  onRefresh,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleDelete = async (id: number) => {
    if (confirm('Delete this record from SQLite database?')) {
      setDeletingId(id);
      try {
        await onDeleteProduct(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* DB Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
            SQLite Table: products ({products.length} records)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700/60 transition-all text-xs"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/30 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows by title or category..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table view */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            No records found matching query.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <tr>
                <th className="p-2.5 w-12 text-center">ID</th>
                <th className="p-2.5 w-14">Image</th>
                <th className="p-2.5">Title & Category</th>
                <th className="p-2.5 w-20">Price</th>
                <th className="p-2.5 w-16 text-center">Stock</th>
                <th className="p-2.5 w-16 text-center">Rating</th>
                <th className="p-2.5 w-14 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                    #{item.id}
                  </td>
                  <td className="p-2.5">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-10 h-10 rounded object-cover border border-slate-800 bg-slate-900"
                      loading="lazy"
                    />
                  </td>
                  <td className="p-2.5">
                    <div className="font-medium text-slate-200 line-clamp-1">{item.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        {item.category}
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5 font-mono text-emerald-400 font-medium">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-center font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                      item.stock < 10 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {item.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                      title="Delete from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
