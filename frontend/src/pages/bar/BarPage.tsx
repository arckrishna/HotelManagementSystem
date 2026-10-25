import React, { useState, useEffect } from 'react';
import { Wine, Plus, CheckCircle, AlertCircle, GlassWater, Clock } from 'lucide-react';
import { barApi, staysApi } from '../../api/client';
import { MenuItem, Order, Stay, OrderStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export const BarPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeStays, setActiveStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  // Modal state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service'>('dine_in');
  const [selectedStayId, setSelectedStayId] = useState<number | undefined>(undefined);
  const [billToRoom, setBillToRoom] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: number; quantity: number }[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordRes, menuRes, stayRes] = await Promise.all([
        barApi.getOrders(),
        barApi.getMenu(),
        staysApi.getActiveStays(),
      ]);
      setOrders(ordRes.data);
      setMenu(menuRes.data);
      setActiveStays(stayRes.data);
      if (stayRes.data.length > 0) setSelectedStayId(stayRes.data[0].id);
    } catch (err) {
      console.error('Failed to load bar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async (id: number, current: boolean) => {
    try {
      await barApi.toggleAvailability(id, !current);
      setMenu(prev => prev.map(m => m.id === id ? { ...m, is_available: !current } : m));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update beverage availability.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const res = await barApi.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update beverage order status.');
    }
  };

  const handleAddItemToOrder = (menuItemId: number) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.menuItemId === menuItemId);
      if (exists) {
        return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId, quantity: 1 }];
    });
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    if (selectedItems.length === 0) {
      setOrderError('Please select at least one beverage.');
      return;
    }

    try {
      await barApi.createOrder({
        department: 'bar',
        order_type: orderType,
        stay_id: orderType === 'room_service' ? selectedStayId : undefined,
        is_billed_to_room: orderType === 'room_service' ? billToRoom : false,
        notes: orderNotes || undefined,
        items: selectedItems.map(i => ({ menu_item_id: i.menuItemId, quantity: i.quantity }))
      });
      setIsOrderModalOpen(false);
      setSelectedItems([]);
      setOrderNotes('');
      loadData();
    } catch (err: any) {
      setOrderError(err.response?.data?.detail || 'Beverage order placement failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bar & Lounge Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Cocktail orders, wine list, spirits inventory tracking, and room service bar delivery.
          </p>
        </div>
        <button
          onClick={() => {
            setOrderError(null);
            setIsOrderModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Beverage Order (Workflow D)</span>
        </button>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'orders'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Bar Station Orders ({orders.filter(o => o.status !== 'completed').length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'menu'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Beverage Menu ({menu.length} drinks)
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => (
            <div key={ord.id} className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-purple-600">#{ord.order_number}</span>
                <Badge variant={ord.status === 'ready' ? 'available' : 'purple'}>{ord.status}</Badge>
              </div>

              <div className="text-xs">
                <span className="font-bold text-slate-900 capitalize">{ord.order_type.replace('_', ' ')}</span>
                {ord.room && <span className="text-purple-700 font-semibold"> — Room {ord.room.room_number}</span>}
              </div>

              <div className="space-y-1 py-2 border-y border-slate-100 text-xs">
                {ord.items.map((itm) => (
                  <div key={itm.id} className="flex justify-between">
                    <span><b className="text-purple-600">{itm.quantity}×</b> {itm.item_name_snapshot}</span>
                    <span className="font-mono text-slate-600">₹{parseFloat(String(itm.subtotal))}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs font-bold">
                <span>Total:</span>
                <span className="text-sm font-black text-slate-900">₹{parseFloat(String(ord.total_amount))}</span>
              </div>

              <div className="pt-2 flex items-center gap-1.5">
                {ord.status === 'new' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'confirmed')}
                    className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                  >
                    Accept & Deduct Spirits
                  </button>
                )}
                {ord.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'ready')}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    Ready for Serving
                  </button>
                )}
                {ord.status === 'ready' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}
                    className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                  >
                    Complete Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-extrabold text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Beverage</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menu.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{m.name}</td>
                  <td className="px-5 py-3.5">{m.category}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">₹{parseFloat(String(m.price))}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleAvailability(m.id, m.is_available)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        m.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {m.is_available ? 'Available' : 'Out of Stock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="Place Bar Order (Workflow D)">
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {orderError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {orderError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-semibold"
            >
              <option value="dine_in">Bar Counter / Lounge</option>
              <option value="room_service">Room Service (Active Guest Stay)</option>
            </select>
          </div>

          {orderType === 'room_service' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Guest Room</label>
              <select
                value={selectedStayId}
                onChange={(e) => setSelectedStayId(parseInt(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-semibold"
              >
                {activeStays.map(s => (
                  <option key={s.id} value={s.id}>
                    Room {s.room?.room_number} — {s.guest?.first_name} {s.guest?.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Drinks</label>
            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y p-1 bg-slate-50">
              {menu.map((m) => (
                <div key={m.id} className="p-2 flex items-center justify-between hover:bg-white rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">{m.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2">₹{parseFloat(String(m.price))}</span>
                  </div>
                  {m.is_available ? (
                    <button
                      type="button"
                      onClick={() => handleAddItemToOrder(m.id)}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      + Add
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Out of Stock</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={selectedItems.length === 0}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            Submit Bar Order
          </button>
        </form>
      </Modal>
    </div>
  );
};
