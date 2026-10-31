import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Star, Phone, Mail, FileText, CheckCircle } from 'lucide-react';
import { guestsApi } from '../../api/client';
import { GuestProfile } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';

export const GuestsPage: React.FC = () => {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Register Guest Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Passport');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [notes, setNotes] = useState('');

  const loadGuests = async (search?: string) => {
    setLoading(true);
    try {
      const res = await guestsApi.getGuests({ search });
      setGuests(res.data);
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadGuests(searchTerm);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await guestsApi.registerGuest({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        id_proof_type: idType,
        id_proof_number: idNumber,
        address,
        vip_status: isVip,
        notes: notes || undefined
      });
      setIsRegisterOpen(false);
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setIdNumber('');
      setAddress('');
      setIsVip(false);
      setNotes('');
      loadGuests();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to register guest.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Guest Directory & Profiles</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered customer database, VIP flags, verification details, and stay history.
          </p>
        </div>
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Guest</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests by name, phone (+91...), or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Search
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); loadGuests(); }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Guests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : guests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No guests found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Guest Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">ID Verification</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {g.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{g.first_name} {g.last_name}</span>
                            {g.vip_status && (
                              <span className="p-0.5 rounded bg-amber-100 text-amber-700" title="VIP Guest">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              </span>
                            )}
                          </div>
                          {g.address && <p className="text-[10px] text-slate-400 truncate max-w-xs">{g.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{g.phone}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{g.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-700">{g.id_proof_type || 'None'}</span>
                      {g.id_proof_number && (
                        <p className="text-[10px] text-slate-400 font-mono">{g.id_proof_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {g.vip_status ? (
                        <Badge variant="amber">VIP Customer</Badge>
                      ) : (
                        <Badge variant="neutral">Standard</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Guest Modal */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Register Hotel Guest">
        <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Priya"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ID Proof Type</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
              >
                <option value="Passport">Passport</option>
                <option value="National ID">Aadhaar / National ID</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ID Document Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. Z12345678"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Worli, Mumbai"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="vipCheck"
              checked={isVip}
              onChange={(e) => setIsVip(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="vipCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
              Mark as VIP Guest (Priority housekeeping & executive lounge access)
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
          >
            Save & Register Guest
          </button>
        </form>
      </Modal>
    </div>
  );
};
