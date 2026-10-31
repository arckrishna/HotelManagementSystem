import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, Plus, Clock, CheckCircle2, 
  AlertCircle, ChefHat, ToggleLeft, ToggleRight, BedDouble, Search 
} from 'lucide-react';
import { restaurantApi, staysApi } from '../../api/client';
import { MenuItem, Order, RestaurantTable, Stay, OrderStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const RestaurantPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeStays, setActiveStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  // New Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service' | 'takeaway'>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<number | undefined>(undefined);
  const [selectedStayId, setSelectedStayId] = useState<number | undefined>(undefined);
  const [billToRoom, setBillToRoom] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: number; quantity: number }[]>([]);
  const [orderError, setOrderError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordRes, menuRes, tblRes, stayRes] = await Promise.all([
        restaurantApi.getOrders(),
        restaurantApi.getMenu(),
        restaurantApi.getTables(),
        staysApi.getActiveStays(),
      ]);
      setOrders(ordRes.data);
      setMenu(menuRes.data);
      setTables(tblRes.data);
      setActiveStays(stayRes.data);

      if (tblRes.data.length > 0) setSelectedTableId(tblRes.data[0].id);
      if (stayRes.data.length > 0) setSelectedStayId(stayRes.data[0].id);
    } catch (err) {
      console.error('Failed to load restaurant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async (id: number, current: boolean) => {
    try {
      await restaurantApi.toggleAvailability(id, !current);
      setMenu(prev => prev.map(m => m.id === id ? { ...m, is_available: !current } : m));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update item availability.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const res = await restaurantApi.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update order status.');
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

  const handleRemoveItemFromOrder = (menuItemId: number) => {
    setSelectedItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    if (selectedItems.length === 0) {
      setOrderError('Please select at least one menu item.');
      return;
    }

    try {
      await restaurantApi.createOrder({
        department: 'restaurant',
        order_type: orderType,
        table_id: orderType === 'dine_in' ? selectedTableId : undefined,
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
      setOrderError(err.response?.data?.detail || 'Order placement failed.');
    }
  };

  // Live order total calculation
  const orderSubtotal = selectedItems.reduce((acc, curr) => {
    const itm = menu.find(m => m.id === curr.menuItemId);
    return acc + (itm ? parseFloat(String(itm.price)) * curr.quantity : 0);
  }, 0);
  const orderTax = Math.round(orderSubtotal * 0.05 * 100) / 100;
  const orderTotal = orderSubtotal + orderTax;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restaurant Kitchen & Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kitchen Display System (KDS), room service tickets, menu availability, and table status.
          </p>
        </div>
        <button
          onClick={() => {
            setOrderError(null);
            setIsOrderModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Place Food Order (Workflow C)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Orders & KDS ({orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'menu'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Menu & Stock Availability ({menu.length} items)
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'tables'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Dine-In Tables ({tables.length})
        </button>
      </div>

      {/* TAB 1: KITCHEN DISPLAY SYSTEM (ORDERS) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-400 text-xs">
              No orders placed yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm transition space-y-3 ${
                    ord.status === 'new' ? 'border-amber-300 bg-amber-50/10' :
                    ord.status === 'preparing' ? 'border-blue-300 bg-blue-50/10' :
                    ord.status === 'ready' ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-blue-600">#{ord.order_number}</span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={
                      ord.status === 'new' ? 'amber' :
                      ord.status === 'preparing' ? 'blue' :
                      ord.status === 'ready' ? 'available' : 'neutral'
                    }>
                      {ord.status}
                    </Badge>
                  </div>

                  <div className="text-xs">
                    <span className="font-bold text-slate-900 capitalize">
                      {ord.order_type.replace('_', ' ')}
                    </span>
                    {ord.table && <span className="text-slate-500"> — Table {ord.table.table_number}</span>}
                    {ord.room && (
                      <span className="text-blue-700 font-semibold"> — Room {ord.room.room_number} (Room Service)</span>
                    )}
                    {ord.is_billed_to_room && (
                      <span className="ml-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        Room Folio Charged
                      </span>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-1 py-2 border-y border-slate-100 text-xs text-slate-700">
                    {ord.items.map((itm) => (
                      <div key={itm.id} className="flex justify-between items-center">
                        <span><b className="text-blue-600">{itm.quantity}×</b> {itm.item_name_snapshot}</span>
                        <span className="text-slate-500 font-mono">₹{parseFloat(String(itm.subtotal))}</span>
                      </div>
                    ))}
                    {ord.notes && (
                      <p className="text-[11px] text-amber-700 italic pt-1">Note: "{ord.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Total with 5% GST:</span>
                    <span className="font-black text-slate-900 text-sm">₹{parseFloat(String(ord.total_amount))}</span>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="pt-2 flex items-center gap-1.5">
                    {ord.status === 'new' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'confirmed')}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                      >
                        Accept & Deduct Stock
                      </button>
                    )}
                    {ord.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'preparing')}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                      >
                        Start Preparing
                      </button>
                    )}
                    {ord.status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'ready')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                      >
                        Mark Ready for Server
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
          )}
        </div>
      )}

      {/* TAB 2: MENU & AVAILABILITY */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">Food Menu Catalog</span>
            <span className="text-[11px] text-slate-400">BR-04: Only Admin can modify menu prices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Prep Time</th>
                  <th className="px-5 py-3.5">In Stock / Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menu.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{m.description}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{m.category}</td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-900">₹{parseFloat(String(m.price))}</td>
                    <td className="px-5 py-3.5 text-slate-500">{m.preparation_time_minutes} mins</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleAvailability(m.id, m.is_available)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          m.is_available 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        <span>{m.is_available ? 'Available' : 'Out of Stock'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TABLES MANAGEMENT */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((tbl) => (
            <div key={tbl.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm text-center space-y-2">
              <span className="text-xl font-black text-slate-900">Table {tbl.table_number}</span>
              <p className="text-xs text-slate-500">Seats {tbl.capacity} guests</p>
              <div>
                <Badge variant={tbl.status === 'occupied' ? 'occupied' : 'available'}>
                  {tbl.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Place Order Modal (Workflow C) */}
      <Modal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="Place Restaurant Order (Workflow C)" maxWidth="max-w-xl">
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {orderError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Order Type *</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-semibold"
              >
                <option value="dine_in">Dine-In (Restaurant Table)</option>
                <option value="room_service">Room Service (Guest Stay)</option>
                <option value="takeaway">Takeaway / Express</option>
              </select>
            </div>

            {orderType === 'dine_in' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Table *</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-semibold"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>Table {t.table_number} ({t.capacity} seats)</option>
                  ))}
                </select>
              </div>
            )}

            {orderType === 'room_service' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Guest Stay / Room *</label>
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
          </div>

          {orderType === 'room_service' && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center space-x-2">
              <input
                type="checkbox"
                id="roomBillToggle"
                checked={billToRoom}
                onChange={(e) => setBillToRoom(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="roomBillToggle" className="text-xs font-bold text-indigo-950 cursor-pointer">
                Post charges to guest's central Room Folio (BR-06)
              </label>
            </div>
          )}

          {/* Menu Items Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Items from Menu</label>
            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y p-1 bg-slate-50">
              {menu.map((m) => (
                <div key={m.id} className="p-2 flex items-center justify-between hover:bg-white rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">{m.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2">₹{parseFloat(String(m.price))}</span>
                    {!m.is_available && (
                      <span className="text-[10px] text-rose-600 font-bold ml-2">(Out of Stock)</span>
                    )}
                  </div>
                  {m.is_available ? (
                    <button
                      type="button"
                      onClick={() => handleAddItemToOrder(m.id)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      + Add
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected items tray */}
          {selectedItems.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
              <p className="font-bold text-[10px] uppercase text-slate-500">Order Tray</p>
              {selectedItems.map((sel) => {
                const item = menu.find(m => m.id === sel.menuItemId);
                return (
                  <div key={sel.menuItemId} className="flex items-center justify-between text-xs">
                    <span>{sel.quantity}× {item?.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">₹{item ? parseFloat(String(item.price)) * sel.quantity : 0}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromOrder(sel.menuItemId)}
                        className="text-rose-600 text-xs font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between font-black text-sm pt-2 border-t text-slate-900">
                <span>Total (with 5% GST):</span>
                <span>₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chef / Preparation Notes</label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="e.g. Less spicy, dressing on the side."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={selectedItems.length === 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            Submit Order to Kitchen
          </button>
        </form>
      </Modal>
    </div>
  );
};
