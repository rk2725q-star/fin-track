import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Receipt, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { CashbookData } from '../types';

export default function Cashbook() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCashbook = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashbook?date=${date}`);
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashbook();
  }, [date]);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  if (loading && !data) return <div className="p-8 text-center">Loading Cashbook...</div>;

  const totalIn = data?.collections.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalOutLoans = data?.disbursements.reduce((sum, l) => sum + l.given_amount, 0) || 0;
  const totalOutExpenses = data?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
  const closingBalance = (data?.opening_balance || 0) + totalIn - totalOutLoans - totalOutExpenses;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="font-bold text-slate-900 outline-none cursor-pointer"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">ஆரம்ப இருப்பு</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-2">Opening</p>
            <p className="font-bold text-slate-900">₹{data?.opening_balance.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">முடிவு இருப்பு</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-2">Closing</p>
            <p className="font-bold text-indigo-600">₹{closingBalance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cash In */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
            <h3 className="font-bold text-emerald-700 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5" /> 
              <div className="text-left">
                <p className="text-xs font-bold leading-none mb-0.5">வரவு (வசூல்)</p>
                <p className="text-[10px] opacity-80 leading-none uppercase tracking-wider">Cash In (Collections)</p>
              </div>
            </h3>
            <span className="font-bold text-emerald-700">₹{totalIn.toLocaleString()}</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {data?.collections.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600">₹{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {data?.collections.length === 0 && (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400 text-sm italic">இன்று வசூல் இல்லை (No collections today)</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Out */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
            <h3 className="font-bold text-rose-700 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5" />
              <div className="text-left">
                <p className="text-xs font-bold leading-none mb-0.5">செலவு (கடன் & செலவுகள்)</p>
                <p className="text-[10px] opacity-80 leading-none uppercase tracking-wider">Cash Out (Loans & Expenses)</p>
              </div>
            </h3>
            <span className="font-bold text-rose-700">₹{(totalOutLoans + totalOutExpenses).toLocaleString()}</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {/* Loans */}
                {data?.disbursements.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{l.customer_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">கடன் வழங்கல் (Loan Disbursement)</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-rose-600">₹{l.given_amount.toLocaleString()}</td>
                  </tr>
                ))}
                {/* Expenses */}
                {data?.expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{e.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">செலவு (Expense)</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-rose-600">₹{e.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {data?.disbursements.length === 0 && data?.expenses.length === 0 && (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400 text-sm italic">இன்று வழங்கல் அல்லது செலவுகள் இல்லை (No cash out today)</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
