import React, { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, ShieldCheck, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { FinancerConfig } from '../types';

interface SettingsProps {
  onUpdate: (config: FinancerConfig) => void;
}

export default function Settings({ onUpdate }: SettingsProps) {
  const [config, setConfig] = useState<FinancerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        setMessage('Settings updated successfully');
        onUpdate(config);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) return <div className="p-8 text-center">Loading Settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">நிதி விதிகள் (Finance Rules)</h3>
            <p className="text-slate-500 text-sm">புதிய கடன்களுக்கான விதிகளை அமைக்கவும் (Configure default rules).</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Takeout Config */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" /> பிடித்தம் முறை (Takeout Method)
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={config.takeout_method === 'fixed'} 
                      onChange={() => setConfig({...config, takeout_method: 'fixed'})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm font-medium">நிலையான தொகை (Fixed)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={config.takeout_method === 'percentage'} 
                      onChange={() => setConfig({...config, takeout_method: 'percentage'})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm font-medium">சதவீதம் (Percentage %)</span>
                  </label>
                </div>
                <input 
                  type="number" 
                  value={config.takeout_value}
                  onChange={(e) => setConfig({...config, takeout_value: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={config.takeout_method === 'fixed' ? "தொகை (₹)" : "சதவீதம் (%)"}
                />
              </div>
            </div>

            {/* Repay Config */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> திருப்பிச் செலுத்தும் முறை (Repayment Method)
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={config.repay_method === 'multiplier'} 
                      onChange={() => setConfig({...config, repay_method: 'multiplier'})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm font-medium">பெருக்ககம் (Multiplier x)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={config.repay_method === 'fixed'} 
                      onChange={() => setConfig({...config, repay_method: 'fixed'})}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm font-medium">நிலையான லாபம் (Fixed Profit)</span>
                  </label>
                </div>
                <input 
                  type="number" 
                  step="0.1"
                  value={config.repay_value}
                  onChange={(e) => setConfig({...config, repay_value: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={config.repay_method === 'multiplier' ? "பெருக்ககம் (e.g. 1.2)" : "லாபத் தொகை (₹)"}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900">அம்சங்கள் (Features)</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium">அபராத முறை (Enable Penalty System)</span>
                  <input 
                    type="checkbox" 
                    checked={config.penalty_enabled}
                    onChange={(e) => setConfig({...config, penalty_enabled: e.target.checked})}
                    className="w-5 h-5 rounded text-indigo-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium">முன்கூட்டியே அடைக்க அனுமதி (Allow Early Closure)</span>
                  <input 
                    type="checkbox" 
                    checked={config.early_closure_allowed}
                    onChange={(e) => setConfig({...config, early_closure_allowed: e.target.checked})}
                    className="w-5 h-5 rounded text-indigo-600"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900">இயல்புநிலை (Defaults)</h4>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">இயல்புநிலை தவணை (Default Frequency)</label>
                <select 
                  value={config.default_payment_frequency}
                  onChange={(e) => setConfig({...config, default_payment_frequency: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="daily">தினசரி (Daily)</option>
                  <option value="weekly">வாராந்திர (Weekly)</option>
                  <option value="monthly">மாதாந்திர (Monthly)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {message && <p className="text-sm font-bold text-emerald-600">
              {message === 'Settings updated successfully' ? 'அமைப்புகள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன (Updated)' : message}
            </p>}
            <button 
              type="submit" 
              disabled={saving}
              className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? (
                <div className="text-left">
                  <p className="text-xs leading-none mb-0.5">சேமிக்கப்படுகிறது...</p>
                  <p className="text-[10px] opacity-80 leading-none uppercase tracking-wider">Saving</p>
                </div>
              ) : (
                <div className="text-left">
                  <p className="text-xs leading-none mb-0.5">மாற்றங்களைச் சேமி</p>
                  <p className="text-[10px] opacity-80 leading-none uppercase tracking-wider">Save Changes</p>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
