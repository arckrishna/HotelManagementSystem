import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('staysync_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for unified error and 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on authentication failure
      localStorage.removeItem('staysync_token');
      localStorage.removeItem('staysync_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// === API SERVICE METHODS ===

export const authApi = {
  login: (credentials: { username_or_email: string; password: string }) => 
    apiClient.post('/auth/login', credentials),
  getMe: () => apiClient.get('/auth/me'),
};

export const roomsApi = {
  getCategories: () => apiClient.get('/rooms/categories'),
  createCategory: (data: any) => apiClient.post('/rooms/categories', data),
  getRooms: (params?: { status?: string; category_id?: number; floor?: number }) => 
    apiClient.get('/rooms', { params }),
  searchAvailable: (params: { check_in_date: string; check_out_date: string; category_id?: number; guests_count?: number }) => 
    apiClient.get('/rooms/available', { params }),
  createRoom: (data: any) => apiClient.post('/rooms', data),
  updateRoom: (id: number, data: any) => apiClient.put(`/rooms/${id}`, data),
  deleteRoom: (id: number) => apiClient.delete(`/rooms/${id}`),
};

export const guestsApi = {
  getGuests: (params?: { search?: string }) => apiClient.get('/guests', { params }),
  getGuest: (id: number) => apiClient.get(`/guests/${id}`),
  registerGuest: (data: any) => apiClient.post('/guests', data),
  updateGuest: (id: number, data: any) => apiClient.put(`/guests/${id}`, data),
  deleteGuest: (id: number) => apiClient.delete(`/guests/${id}`),
  getReservations: (id: number) => apiClient.get(`/guests/${id}/reservations`),
};

export const reservationsApi = {
  getReservations: (params?: { status?: string; guest_id?: number; room_id?: number }) => 
    apiClient.get('/reservations', { params }),
  getMyReservations: () => apiClient.get('/reservations/my'),
  getReservation: (id: number) => apiClient.get(`/reservations/${id}`),
  createReservation: (data: any) => apiClient.post('/reservations', data),
  updateReservation: (id: number, data: any) => apiClient.put(`/reservations/${id}`, data),
  cancelReservation: (id: number) => apiClient.put(`/reservations/${id}/cancel`),
};

export const staysApi = {
  getActiveStays: () => apiClient.get('/stays/active'),
  getMyStay: () => apiClient.get('/stays/my'),
  activateDemoStay: () => apiClient.post('/stays/demo-checkin'),
  getStay: (id: number) => apiClient.get(`/stays/${id}`),
  checkIn: (data: { reservation_id: number; initial_room_condition_notes?: string }) => 
    apiClient.post('/stays/check-in', data),
  checkOut: (stayId: number, data: { checkout_notes?: string }) => 
    apiClient.post(`/stays/${stayId}/check-out`, data),
};

export const restaurantApi = {
  getMenu: (params?: { category?: string; available_only?: boolean }) => 
    apiClient.get('/restaurant/menu', { params }),
  createMenuItem: (data: any) => apiClient.post('/restaurant/menu', data),
  updateMenuItem: (id: number, data: any) => apiClient.put(`/restaurant/menu/${id}`, data),
  deleteMenuItem: (id: number) => apiClient.delete(`/restaurant/menu/${id}`),
  toggleAvailability: (id: number, is_available: boolean) => 
    apiClient.patch(`/restaurant/menu/${id}/availability`, null, { params: { is_available } }),
  getTables: () => apiClient.get('/restaurant/tables'),
  createTable: (data: any) => apiClient.post('/restaurant/tables', data),
  updateTableStatus: (id: number, status: string) => 
    apiClient.patch(`/restaurant/tables/${id}/status`, null, { params: { status } }),
  getOrders: (params?: { status?: string; order_type?: string }) => 
    apiClient.get('/restaurant/orders', { params }),
  createOrder: (data: any) => apiClient.post('/restaurant/orders', data),
  updateOrderStatus: (id: number, status: string) => 
    apiClient.put(`/restaurant/orders/${id}/status`, { status }),
};

export const barApi = {
  getMenu: (params?: { category?: string; available_only?: boolean }) => 
    apiClient.get('/bar/menu', { params }),
  createMenuItem: (data: any) => apiClient.post('/bar/menu', data),
  updateMenuItem: (id: number, data: any) => apiClient.put(`/bar/menu/${id}`, data),
  toggleAvailability: (id: number, is_available: boolean) => 
    apiClient.patch(`/bar/menu/${id}/availability`, null, { params: { is_available } }),
  getOrders: (params?: { status?: string }) => apiClient.get('/bar/orders', { params }),
  createOrder: (data: any) => apiClient.post('/bar/orders', data),
  updateOrderStatus: (id: number, status: string) => 
    apiClient.put(`/bar/orders/${id}/status`, { status }),
};

export const inventoryApi = {
  getItems: (params?: { category?: string; low_stock_only?: boolean }) => 
    apiClient.get('/inventory', { params }),
  createItem: (data: any) => apiClient.post('/inventory', data),
  updateItem: (id: number, data: any) => apiClient.put(`/inventory/${id}`, data),
  adjustStock: (id: number, data: { movement_type: string; quantity_delta: number | string; reason?: string }) => 
    apiClient.post(`/inventory/${id}/adjust`, data),
  getMovements: (params?: { item_id?: number }) => apiClient.get('/inventory/movements', { params }),
  getRecipes: (params?: { menu_item_id?: number }) => apiClient.get('/inventory/recipes', { params }),
  createRecipe: (data: any) => apiClient.post('/inventory/recipes', data),
};

export const maintenanceApi = {
  getRequests: (params?: { status?: string; priority?: string; room_id?: number; assigned_to_me?: boolean }) => 
    apiClient.get('/maintenance', { params }),
  createRequest: (data: any) => apiClient.post('/maintenance', data),
  assignTechnician: (id: number, assigned_to_user_id: number) => 
    apiClient.put(`/maintenance/${id}/assign`, { assigned_to_user_id }),
  updateStatus: (id: number, data: { status: string; resolution_notes?: string }) => 
    apiClient.put(`/maintenance/${id}/status`, data),
};

export const billingApi = {
  getBills: (params?: { status?: string; guest_id?: number }) => apiClient.get('/bills', { params }),
  getMyBills: () => apiClient.get('/bills/my'),
  getBill: (id: number) => apiClient.get(`/bills/${id}`),
};

export const paymentsApi = {
  getPayments: (params?: { bill_id?: number }) => apiClient.get('/payments', { params }),
  createPayment: (billId: number, data: { amount: string | number; payment_method: string; reference_number?: string; notes?: string }) => 
    apiClient.post(`/payments?bill_id=${billId}`, data),
};

export const notificationsApi = {
  getNotifications: (params?: { unread_only?: boolean }) => apiClient.get('/notifications', { params }),
  markAsRead: (id: number) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/notifications/read-all'),
};

export const reportsApi = {
  getDashboardKpis: () => apiClient.get('/reports/dashboard'),
  getRecentActivities: () => apiClient.get('/reports/recent-activities'),
  getSalesReport: () => apiClient.get('/reports/sales'),
  getOccupancyReport: () => apiClient.get('/reports/occupancy'),
  getExportUrl: (reportType: string) => `${API_BASE_URL}/reports/export?report_type=${reportType}`,
  downloadReport: async (reportType: string) => {
    const response = await apiClient.get(`/reports/export?report_type=${reportType}`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `staysync_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export const usersApi = {
  getUsers: (params?: { role?: string }) => apiClient.get('/users', { params }),
  getTechnicians: () => apiClient.get('/users/technicians'),
  createUser: (data: any) => apiClient.post('/users', data),
  updateUser: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: number) => apiClient.delete(`/users/${id}`),
};

export const auditApi = {
  getLogs: (params?: { action?: string; entity_type?: string }) => apiClient.get('/audit-logs', { params }),
};

export const feedbackApi = {
  getServiceRequests: (params?: { status?: string }) => apiClient.get('/feedback/service-requests', { params }),
  createServiceRequest: (data: any) => apiClient.post('/feedback/service-requests', data),
  updateServiceRequestStatus: (id: number, status: string) => 
    apiClient.patch(`/feedback/service-requests/${id}/status`, { status }),
  getGuestReviews: () => apiClient.get('/feedback/guest-reviews'),
  submitGuestReview: (data: any) => apiClient.post('/feedback/guest-reviews', data),
};
