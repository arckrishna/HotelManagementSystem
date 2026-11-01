import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { 
  Boxes, Plus, AlertTriangle, ArrowUpDown, History, 
  Search, CheckCircle2, TrendingDown, ArrowUpRight, ArrowDownRight, Layers 
} from 'lucide-react';
import { inventoryApi } from '../../api/client';
import { InventoryItem, InventoryMovement } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const InventoryPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // New item form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food Ingredient');
  const [unit, setUnit] = useState('kg');
  const [currentQty, setCurrentQty] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [unitCost, setUnitCost] = useState('');

  // Stock adjust form
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustType, setAdjustType] = useState('purchase_receipt');
  const [adjustReason, setAdjustReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, movRes] = await Promise.all([
        inventoryApi.getItems({ low_stock_only: lowStockOnly }),
        inventoryApi.getMovements().catch(() => ({ data: [] }))
      ]);
      setItems(invRes.data);
      setMovements(movRes.data);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lowStockOnly]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createItem({
        name,
        category,
        unit,
        current_quantity: Number(currentQty),
        min_threshold: Number(minThreshold),
        unit_cost: Number(unitCost)
      });
      setIsAddOpen(false);
      setName('');
      setCurrentQty('');
      setMinThreshold('');
      setUnitCost('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create inventory item.');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      let delta = Number(adjustDelta);
      if (adjustType === 'waste_damage' && delta > 0) {
        delta = -delta;
      }
      await inventoryApi.adjustStock(selectedItem.id, {
        movement_type: adjustType,
        quantity_delta: delta,
        reason: adjustReason || undefined
      });
      toast.success(`Successfully adjusted stock for ${selectedItem.name}!`);
      setIsAdjustOpen(false);
      setSelectedItem(null);
      setAdjustDelta('');
      setAdjustReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to adjust stock.');
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  const filteredItems = items.filter(i => {
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    }
    return true;
  });

  const lowStockCount = items.filter(i => Number(i.current_quantity) <= Number(i.min_threshold)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Boxes className="w-7 h-7 mr-2.5 text-blue-600" />
            Inventory & Stock Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized ingredients, beverages, and linen tracking with recipe consumption
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'admin' || user?.role === 'inventory_manager') && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Inventory Item
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Items Cataloged</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          lowStockCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${
            lowStockCount > 0 ? 'text-rose-700' : 'text-slate-500'
          }`}>Low Stock Alerts</p>
          <p className={`text-2xl font-bold mt-1 ${
            lowStockCount > 0 ? 'text-rose-700' : 'text-slate-900'
          }`}>{lowStockCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Item Categories</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Movements</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{movements.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'stock'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4 mr-2" />
          Active Stock Items ({filteredItems.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4 mr-2" />
          Stock Usage History ({movements.length})
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search inventory item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center ${
                  lowStockOnly
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading stock records...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No matching inventory items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Available Stock</th>
                      <th className="py-3 px-4">Min Threshold</th>
                      <th className="py-3 px-4">Unit Cost</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const isLow = Number(item.current_quantity) <= Number(item.min_threshold);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-mono font-bold ${
                              isLow ? 'text-rose-600' : 'text-slate-900'
                            }`}>
                              {item.current_quantity} {item.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {item.min_threshold} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-mono">
                            ₹{Number(item.unit_cost).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            {isLow ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                Adequate
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {(user?.role === 'admin' || user?.role === 'inventory_manager') && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsAdjustOpen(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                Adjust Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No stock movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Quantity Change</th>
                    <th className="py-3 px-4">Balance After</th>
                    <th className="py-3 px-4">Reason / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {movements.map((mov) => {
                    const delta = Number(mov.quantity_delta);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-slate-500 font-sans">
                          {new Date(mov.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                          {mov.inventory_item?.name || `Item #${mov.inventory_item_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                            {mov.movement_type?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-bold ${
                          delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {mov.after_quantity}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans">
                          {mov.reason || (mov.reference_order_id ? `Order #${mov.reference_order_id}` : 'Manual Adjustment')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Inventory Item */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Catalog New Inventory Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Basmati Rice, Olive Oil, Bath Towels"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Food Ingredient">Food Ingredient</option>
                <option value="Beverage">Beverage</option>
                <option value="Linens">Linens</option>
                <option value="Guest Supplies">Guest Supplies</option>
                <option value="Cleaning Chemicals">Cleaning Chemicals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Measurement Unit</label>
              <input
                type="text"
                required
                placeholder="kg, L, bottles, sets, kits"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Qty</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="100"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Threshold</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="20"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit Cost (₹)</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="150.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Create Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock */}
      <Modal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title={`Stock Adjustment: ${selectedItem?.name}`}>
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex justify-between">
            <span>Current Stock: <strong>{selectedItem?.current_quantity} {selectedItem?.unit}</strong></span>
            <span>Min Alert Level: <strong>{selectedItem?.min_threshold} {selectedItem?.unit}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Adjustment Type</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="purchase_receipt">Restock / Purchase (+)</option>
                <option value="manual_adjustment">Manual Correction (±)</option>
                <option value="waste_damage">Spoilage / Wastage (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Quantity Delta</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. +50 or -5"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason / Supplier Invoice Ref</label>
            <input
              type="text"
              placeholder="e.g. PO #8832 from Metro Cash & Carry, damaged packaging"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
