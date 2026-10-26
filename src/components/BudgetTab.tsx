import React from 'react';
import { Wallet, Construction, DollarSign, Users, LineChart } from 'lucide-react';

export const BudgetTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Under Construction Banner */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
          <Wallet className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-3">
          <Construction className="w-3.5 h-3.5" />
          <span>Under Construction</span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          Budget & Financial Tracking
        </h3>

        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The budget module is currently under active development. You will soon be able to track coin market conversions, worker payouts, and calculate overall profitability across all maps and pins.
        </p>

        {/* Planned Modules Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Coin Valuation</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Live coin-to-currency exchange rate conversions.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Worker Payroll</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Track wage disbursements and coin splits per person.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <LineChart className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Revenue Ledger</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Periodic summaries and net margin analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
