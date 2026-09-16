import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  ReceiptIndianRupee, 
  Plus, 
  TrendingUp, 
  Wallet,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Loan, Expense, DashboardData, User, FinancerConfig } from './types';
import Sidebar from './components/Sidebar';
import Cashbook from './components/Cashbook';
import Settings from './components/Settings';
import Chatbot from './components/Chatbot';
import { Trash2, Search, Filter } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'loans' | 'expenses' | 'cashbook' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  
  // Dashboard Period states
  const [dashboardPeriod, setDashboardPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [loanForm, setLoanForm] = useState({
    asked_amount: '',
    takeout_amount: '',
    total_repay: '',
    payment_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (showAddLoan && user?.config) {
      setLoanForm(prev => ({
        ...prev,
        payment_type: user.config.default_payment_frequency,
        start_date: new Date().toISOString().split('T')[0]
      }));
    }
  }, [showAddLoan, user?.config]);

  const calculateLoanDetails = (asked: number, manualTakeout?: number) => {
    if (!user?.config) return;
    
    let takeout = manualTakeout ?? 0;
    if (manualTakeout === undefined) {
      if (user.config.takeout_method === 'fixed') {
        takeout = user.config.takeout_value;
      } else {
        takeout = (asked * user.config.takeout_value) / 100;
      }
    }

    let repay = 0;
    if (user.config.repay_method === 'multiplier') {
      repay = asked * user.config.repay_value;
    } else {
      repay = asked + user.config.repay_value;
    }

    setLoanForm(prev => ({
      ...prev,
      asked_amount: String(asked),
      takeout_amount: String(takeout),
      total_repay: String(repay)
    }));
  };
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState<number | null>(null);
  const [showEarlyClose, setShowEarlyClose] = useState<number | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [loanPayments, setLoanPayments] = useState<Record<number, any[]>>({});
  const [isHistoryLoading, setIsHistoryLoading] = useState<Record<number, boolean>>({});

  const fetchLoanPayments = async (loanId: number) => {
    if (loanPayments[loanId]) return;
    setIsHistoryLoading(prev => ({ ...prev, [loanId]: true }));
    try {
      const res = await fetch(`/api/payments?loan_id=${loanId}`);
      const data = await res.json();
      setLoanPayments(prev => ({ ...prev, [loanId]: data }));
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsHistoryLoading(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const fetchData = async () => {
    try {
      const [dashRes, custRes, loanRes, expRes, userRes] = await Promise.all([
        fetch(`/api/dashboard?period=${dashboardPeriod}&date=${dashboardDate}`),
        fetch('/api/customers'),
        fetch('/api/loans'),
        fetch('/api/expenses'),
        fetch('/api/me')
      ]);
      
      setDashboard(await dashRes.json());
      setCustomers(await custRes.json());
      setLoans(await loanRes.json());
      setExpenses(await expRes.json());
      setUser(await userRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardPeriod, dashboardDate]);

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('இந்த வாடிக்கையாளரை நீக்க விரும்புகிறீர்களா? (Are you sure you want to delete this customer?)')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete customer');
        return;
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        place: formData.get('place'),
        phone: formData.get('phone'),
        preferred_frequency: formData.get('preferred_frequency'),
        preferred_day: formData.get('preferred_day')
      })
    });
    setShowAddCustomer(false);
    fetchData();
  };

  const handleAddLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: Number(formData.get('customer_id')),
        asked_amount: Number(loanForm.asked_amount),
        takeout_amount: Number(loanForm.takeout_amount),
        total_repay: Number(loanForm.total_repay),
        payment_type: loanForm.payment_type,
        start_date: loanForm.start_date || new Date().toISOString()
      })
    });
    setShowAddLoan(false);
    setLoanForm({ asked_amount: '', takeout_amount: '', total_repay: '', payment_type: 'daily', start_date: '' });
    fetchData();
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_id: showAddPayment,
        amount: Number(formData.get('amount')),
        payment_date: formData.get('payment_date') || new Date().toISOString()
      })
    });
    setShowAddPayment(null);
    fetchData();
  };

  const handleEarlyClose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch(`/api/loans/${showEarlyClose}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlement_amount: Number(formData.get('amount')) })
    });
    setShowEarlyClose(null);
    fetchData();
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(formData.get('amount')),
        description: formData.get('description'),
        expense_date: formData.get('expense_date') || new Date().toISOString()
      })
    });
    setShowAddExpense(false);
    fetchData();
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (c.place || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (c.phone || '').includes(searchQuery);
    
    const matchesFrequency = filterType === 'all' || c.preferred_frequency === filterType;
    
    let matchesDay = true;
    if (filterType === 'daily') {
      if (selectedDay === 'all') {
        matchesDay = true; // Show all daily customers
      } else {
        matchesDay = c.preferred_day === selectedDay; // Show only specific day customers
      }
    }
    
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && matchesFrequency && matchesDay;
  });

  const filteredLoans = loans.filter(l => {
    const customer = customers.find(c => c.id === l.customer_id);
    const customerName = l.customer_name || customer?.name || '';
    
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || l.payment_type === filterType;
    
    // Day-wise categorization for daily finance
    if (filterType === 'daily') {
      if (selectedDay === 'all') {
        return matchesSearch && matchesType;
      } else {
        const matchesDay = customer?.preferred_day === selectedDay;
        return matchesSearch && matchesType && matchesDay;
      }
    }
    
    return matchesSearch && matchesType;
  });

  const formatDateDetailed = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ta-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + ` (${date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })})`;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0 lg:ml-64'} p-4 lg:p-8`}>
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <Filter className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 capitalize">
                  {activeTab === 'dashboard' && 'டேஷ்போர்டு (Dashboard)'}
                  {activeTab === 'customers' && 'வாடிக்கையாளர்கள் (Customers)'}
                  {activeTab === 'loans' && 'கடன்கள் (Loans)'}
                  {activeTab === 'expenses' && 'செலவுகள் (Expenses)'}
                  {activeTab === 'cashbook' && 'ரொக்கப் புத்தகம் (Cashbook)'}
                  {activeTab === 'settings' && 'அமைப்புகள் (Settings)'}
                </h2>
              </div>
              <p className="text-slate-500 text-xs lg:text-sm font-medium">வணக்கம் (Welcome back), {user?.name}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {(activeTab === 'customers' || activeTab === 'loans') && (
              <div className="relative flex items-center w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="தேடல் (Search...)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-full shadow-sm"
                />
              </div>
            )}
            {activeTab === 'customers' && (
              <button onClick={() => setShowAddCustomer(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Plus className="w-4 h-4" /> 
                <div className="text-left">
                  <p className="text-[10px] font-bold leading-none">வாடிக்கையாளர் சேர்க்க</p>
                  <p className="text-[8px] opacity-80 leading-none uppercase tracking-wider">Add Customer</p>
                </div>
              </button>
            )}
            {activeTab === 'loans' && (
              <button onClick={() => setShowAddLoan(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Plus className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-[10px] font-bold leading-none">புதிய கடன்</p>
                  <p className="text-[8px] opacity-80 leading-none uppercase tracking-wider">New Loan</p>
                </div>
              </button>
            )}
            {activeTab === 'expenses' && (
              <button onClick={() => setShowAddExpense(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Plus className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-[10px] font-bold leading-none">செலவு சேர்க்க</p>
                  <p className="text-[8px] opacity-80 leading-none uppercase tracking-wider">Add Expense</p>
                </div>
              </button>
            )}
          </div>
        </header>

        {(activeTab === 'customers' || activeTab === 'loans') && (
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {[
                { id: 'all', label: 'அனைத்தும்', sub: 'All' },
                { id: 'daily', label: 'தினசரி', sub: 'Daily' },
                { id: 'weekly', label: 'வாராந்திர', sub: 'Weekly' },
                { id: 'monthly', label: 'மாதாந்திர', sub: 'Monthly' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <p className="leading-none mb-0.5">{t.label}</p>
                  <p className="text-[8px] opacity-80 uppercase tracking-widest">{t.sub}</p>
                </button>
              ))}
            </div>

            {filterType === 'daily' && (
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                {[
                  { id: 'all', label: 'அனைத்து நாட்கள்', sub: 'All Days' },
                  { id: 'monday', label: 'திங்கள்', sub: 'Mon' },
                  { id: 'tuesday', label: 'செவ்வாய்', sub: 'Tue' },
                  { id: 'wednesday', label: 'புதன்', sub: 'Wed' },
                  { id: 'thursday', label: 'வியாழன்', sub: 'Thu' },
                  { id: 'friday', label: 'வெள்ளி', sub: 'Fri' },
                  { id: 'saturday', label: 'சனி', sub: 'Sat' },
                  { id: 'sunday', label: 'ஞாயிறு', sub: 'Sun' }
                ].map(d => (
                  <button 
                    key={d.id}
                    onClick={() => setSelectedDay(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${selectedDay === d.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <p className="leading-none mb-0.5">{d.label}</p>
                    <p className="text-[8px] opacity-80 uppercase tracking-widest">{d.sub}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && dashboard && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {/* Period Selector */}
              <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['day', 'week', 'month', 'year'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setDashboardPeriod(p as any)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${dashboardPeriod === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {p === 'day' ? 'நாள்' : p === 'week' ? 'வாரம்' : p === 'month' ? 'மாதம்' : 'ஆண்டு'} ({p})
                    </button>
                  ))}
                </div>
                <input 
                  type="date" 
                  value={dashboardDate}
                  onChange={(e) => setDashboardDate(e.target.value)}
                  className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'செயலில் உள்ள கடன்கள்', sub: 'Active Loans', val: dashboard.overall.active_loans || 0, icon: HandCoins, color: 'indigo' },
                  { label: 'மொத்தம் வசூலிக்கப்பட்டது', sub: 'Total Collected', val: `₹${(dashboard.overall.total_collected || 0).toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
                  { label: 'நிலுவையில் உள்ளது', sub: 'Total Pending', val: `₹${(dashboard.overall.total_pending || 0).toLocaleString()}`, icon: Clock, color: 'amber' },
                  { label: 'எதிர்பார்க்கப்படும் லாபம்', sub: 'Potential Profit', val: `₹${(dashboard.overall.total_profit_potential || 0).toLocaleString()}`, icon: TrendingUp, color: 'purple' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl w-fit mb-4`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-slate-900 text-xs font-bold mb-0.5">{stat.label}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">{stat.sub}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stat.val}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-6">
                    {dashboardPeriod === 'day' ? 'இன்றைய' : dashboardPeriod === 'week' ? 'இந்த வார' : dashboardPeriod === 'month' ? 'இந்த மாத' : 'இந்த ஆண்டு'} செயல்பாடு 
                    ({dashboardPeriod.toUpperCase()} Performance)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
                    <div className="space-y-1">
                      <p className="text-slate-900 text-xs font-bold">வசூலிக்கப்பட்டது</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase mb-2">Collected</p>
                      <p className="text-xl lg:text-2xl font-bold text-emerald-600">₹{(dashboard.period.collected || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 text-xs font-bold">செலவுகள்</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase mb-2">Expenses</p>
                      <p className="text-xl lg:text-2xl font-bold text-rose-600">₹{(dashboard.period.expenses || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 text-xs font-bold">நிகர ரொக்கம்</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase mb-2">Net Cash</p>
                      <p className="text-xl lg:text-2xl font-bold text-indigo-600">₹{(dashboard.period.net || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-6">கடன் வகைகள் (Loan Types)</h4>
                  <div className="space-y-4">
                    {dashboard.loansByType.map((type) => (
                      <div key={type.payment_type} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-slate-900 capitalize">
                            {type.payment_type === 'daily' ? 'தினசரி (Daily)' : 
                             type.payment_type === 'weekly' ? 'வாராந்திர (Weekly)' : 
                             'மாதாந்திர (Monthly)'}
                          </p>
                          <p className="text-xs text-slate-500">{type.count} Active</p>
                        </div>
                        <p className="font-bold text-indigo-600">₹{(type.pending || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div key="customers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCustomers.map((c) => {
                const isExpanded = expandedCustomerId === c.id;
                const customerLoans = loans.filter(l => l.customer_id === c.id);
                
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                    <div 
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            {c.name}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </h4>
                          <div className="flex gap-1.5 mt-1">
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              {c.preferred_frequency === 'daily' ? 'தினசரி' : 
                               c.preferred_frequency === 'weekly' ? 'வாராந்திர' : 'மாதாந்திர'}
                            </span>
                            {c.preferred_frequency !== 'monthly' && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                {c.preferred_day === 'all' ? 'அனைத்து நாட்கள்' : c.preferred_day}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id); }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.place}</div>
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-50 bg-slate-50/50"
                        >
                          <div className="p-4 space-y-3">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <HandCoins className="w-3 h-3" /> கடன்கள் (Loans)
                            </h5>
                            {customerLoans.length > 0 ? (
                              <div className="space-y-2">
                                {customerLoans.map(l => (
                                  <div 
                                    key={l.id} 
                                    className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-all"
                                    onClick={() => {
                                      setActiveTab('loans');
                                      setExpandedLoanId(l.id);
                                      fetchLoanPayments(l.id);
                                    }}
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDateDetailed(l.start_date)}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${l.status === 'closed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {l.status === 'closed' ? 'முடிந்தது' : 'செயலில்'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                      <div>
                                        <p className="text-sm font-bold text-slate-900">₹{(l.total_repay || 0).toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">பாக்கி: ₹{(l.balance || 0).toLocaleString()}</p>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic py-2">கடன்கள் இல்லை</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filteredCustomers.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                  வாடிக்கையாளர்கள் இல்லை (No customers found)
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'loans' && (
            <motion.div key="loans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredLoans.map((l) => {
                const isExpanded = expandedLoanId === l.id;
                const payments = loanPayments[l.id] || [];
                const isLoading = isHistoryLoading[l.id];

                return (
                  <div key={l.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                    <div 
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        const nextState = isExpanded ? null : l.id;
                        setExpandedLoanId(nextState);
                        if (nextState) fetchLoanPayments(l.id);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            {l.customer_name}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </h4>
                          <div className="flex gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              {l.payment_type === 'daily' ? 'தினசரி' : 
                               l.payment_type === 'weekly' ? 'வாராந்திர' : 'மாதாந்திர'}
                            </span>
                            {l.payment_type === 'daily' && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                {new Date(l.start_date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                        {l.status === 'closed' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> முடிந்தது
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> செயலில்
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">திருப்பிச் செலுத்தும் தொகை</p>
                          <p className="text-base font-bold text-slate-900">₹{(l.total_repay || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">வழங்கியது</p>
                          <p className="text-base font-bold text-slate-600">₹{(l.given_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500 uppercase tracking-widest">முன்னேற்றம்</span>
                          <span className="text-emerald-600">₹{(l.total_paid || 0).toLocaleString()} / ₹{(l.total_repay || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((l.total_paid || 0) / (l.total_repay || 1)) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Wallet className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">₹{(l.balance || 0).toLocaleString()} பாக்கி</span>
                        </div>
                        
                        {l.status === 'active' && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setShowAddPayment(l.id)} 
                              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-[9px] uppercase tracking-wider hover:bg-indigo-700 transition-colors"
                            >
                              கட்டணம்
                            </button>
                            {user?.config.early_closure_allowed && (
                              <button 
                                onClick={() => setShowEarlyClose(l.id)} 
                                className="px-2.5 py-1.5 border border-rose-200 text-rose-500 rounded-lg font-bold text-[9px] uppercase tracking-wider hover:bg-rose-50 transition-colors"
                              >
                                அடைப்பு
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-50 bg-slate-50/50"
                        >
                          <div className="p-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <History className="w-3 h-3 text-indigo-600" /> கட்டண வரலாறு (History)
                            </h5>
                            
                            {isLoading ? (
                              <div className="py-4 text-center text-slate-400 text-[10px] italic">ஏற்றப்படுகிறது...</div>
                            ) : payments.length > 0 ? (
                              <div className="space-y-2">
                                {payments.map((p, i) => {
                                  const date = new Date(p.payment_date);
                                  return (
                                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center font-bold text-indigo-600 text-[10px]">
                                          {payments.length - i}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900 text-xs">₹{p.amount.toLocaleString()}</p>
                                          <p className="text-[8px] text-slate-400 font-bold uppercase">
                                            {date.toLocaleDateString('ta-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-900">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic py-2">வரலாறு இல்லை</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filteredLoans.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                  கடன்கள் இல்லை (No loans found)
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="min-w-[600px] lg:w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">விவரம் (Description)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">தொகை (Amount)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">தேதி (Date)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{e.description}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">₹{(e.amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-400 text-[10px] font-medium">
                        {formatDateDetailed(e.expense_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'cashbook' && <Cashbook />}
          {activeTab === 'settings' && <Settings onUpdate={(config) => setUser(user ? { ...user, config } : null)} />}
        </AnimatePresence>
      </main>

      <Chatbot 
        dashboard={dashboard} 
        customers={customers} 
        loans={loans} 
        expenses={expenses} 
        setActiveTab={setActiveTab}
      />

      {/* Modals */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-slate-900">புதிய வாடிக்கையாளர் (Add Customer)</h3>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">பெயர் (Name)</label>
                    <input name="name" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ஊர் (Place)</label>
                    <input name="place" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">தொடர்பு எண் (Phone)</label>
                  <input name="phone" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">வகை (Frequency)</label>
                    <select name="preferred_frequency" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="daily">தினசரி (Daily)</option>
                      <option value="weekly">வாராந்திர (Weekly)</option>
                      <option value="monthly">மாதாந்திர (Monthly)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">நாள் (Preferred Day)</label>
                    <select name="preferred_day" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="all">அனைத்து நாட்கள் (All Days)</option>
                      <option value="monday">திங்கள் (Monday)</option>
                      <option value="tuesday">செவ்வாய் (Tuesday)</option>
                      <option value="wednesday">புதன் (Wednesday)</option>
                      <option value="thursday">வியாழன் (Thursday)</option>
                      <option value="friday">வெள்ளி (Friday)</option>
                      <option value="saturday">சனி (Saturday)</option>
                      <option value="sunday">ஞாயிறு (Sunday)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">ரத்து (Cancel)</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">சேமி (Save)</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6 text-slate-900">புதிய கடன் (New Loan)</h3>
              
              {/* Recent Customers Suggestions */}
              {(() => {
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
                const recentCustomers = customers.filter(c => new Date(c.created_at) > thirtyMinsAgo);
                if (recentCustomers.length > 0) {
                  return (
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">சமீபத்தில் சேர்க்கப்பட்டவர்கள் (Recently Added)</p>
                      <div className="flex flex-wrap gap-2">
                        {recentCustomers.map(c => (
                          <button 
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const select = document.querySelector('select[name="customer_id"]') as HTMLSelectElement;
                              if (select) select.value = String(c.id);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <form onSubmit={handleAddLoan} className="space-y-4">
                <select name="customer_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">வாடிக்கையாளர் (Select Customer)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">தொகை (Asked Amount)</label>
                    <input 
                      type="number" 
                      name="asked_amount" 
                      value={loanForm.asked_amount}
                      onChange={(e) => calculateLoanDetails(Number(e.target.value))}
                      placeholder="Asked Amount" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">பிடித்தம் (Takeout)</label>
                    <input 
                      type="number" 
                      name="takeout_amount" 
                      value={loanForm.takeout_amount}
                      onChange={(e) => calculateLoanDetails(Number(loanForm.asked_amount), Number(e.target.value))}
                      placeholder="Takeout" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>

                {/* Calculation Summary */}
                {loanForm.asked_amount && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">கைக்கு வரும் தொகை (Net Given):</span>
                      <span className="font-bold text-slate-900">₹{(Number(loanForm.asked_amount) - Number(loanForm.takeout_amount)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">லாபம் (Profit Potential):</span>
                      <span className="font-bold text-emerald-600">₹{(Number(loanForm.total_repay) - Number(loanForm.asked_amount)).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">திருப்பிச் செலுத்தும் தொகை (Total Repay)</label>
                  <input 
                    type="number" 
                    name="total_repay" 
                    value={loanForm.total_repay}
                    onChange={(e) => setLoanForm({...loanForm, total_repay: e.target.value})}
                    placeholder="Total Repay" 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">வகை (Type)</label>
                    <select 
                      name="payment_type" 
                      value={loanForm.payment_type}
                      onChange={(e) => setLoanForm({...loanForm, payment_type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="daily">தினசரி (Daily)</option>
                      <option value="weekly">வாராந்திர (Weekly)</option>
                      <option value="monthly">மாதாந்திர (Monthly)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">தொடக்க தேதி (Start Date)</label>
                    <input 
                      type="date" 
                      name="start_date" 
                      value={loanForm.start_date}
                      onChange={(e) => setLoanForm({...loanForm, start_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddLoan(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">ரத்து (Cancel)</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">உருவாக்கு (Create)</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddPayment !== null && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-slate-900">கட்டணம் வசூல் (Record Payment)</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <input type="number" name="amount" placeholder="வசூலித்த தொகை (Amount Paid)" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="date" name="payment_date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddPayment(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">ரத்து (Cancel)</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100">பதிவு செய் (Record)</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEarlyClose !== null && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-2 text-slate-900">கடன் அடைப்பு (Early Closure)</h3>
              <p className="text-slate-500 text-sm mb-6">கடன் முடிக்க இறுதித் தொகையை உள்ளிடவும் (Enter settlement amount).</p>
              <form onSubmit={handleEarlyClose} className="space-y-4">
                <input type="number" name="amount" placeholder="முடிவுத் தொகை (Settlement Amount)" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowEarlyClose(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">ரத்து (Cancel)</button>
                  <button type="submit" className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100">கடன் முடி (Close Loan)</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddExpense && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-slate-900">செலவு சேர்க்க (Add Expense)</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <input type="number" name="amount" placeholder="தொகை (Amount)" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input name="description" placeholder="விவரம் (Description - e.g. Petrol)" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="date" name="expense_date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">ரத்து (Cancel)</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">சேமி (Save)</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
