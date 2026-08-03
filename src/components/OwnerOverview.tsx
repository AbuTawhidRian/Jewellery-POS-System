import React from 'react';
import { Building2, Store, Landmark, DollarSign, Pickaxe, Scale } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OwnerStats {
  mainStockWeight: number;
  mainStockGrossWeight?: number;
  mainStockMakingCharge: number;
  mainCashBalance: number;
  mainStockByType?: any;
  normalStockWeight: number;
  normalStockGrossWeight?: number;
  normalStockMakingCharge: number;
  normalMakingCollected: number;
  normalCashBalance: number;
  normalStockByType?: any;
  totalMakingCollected: number;
}

interface OwnerOverviewProps {
  stats: OwnerStats;
}

const OwnerOverview: React.FC<OwnerOverviewProps> = ({ stats }) => {
  const { user } = useAuth();
  const currency = user?.shopCurrency || 'AED';

  const Card = ({ title, mainValue, normalValue, grossMainValue, grossNormalValue, mainByType, normalByType, icon: Icon, isCurrency = false, isWeight = false }: any) => (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <Icon className="w-6 h-6 text-[#C28C46]" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Branch</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isCurrency && <span className="text-sm text-slate-400 mr-1">{currency}</span>}
              {mainValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {isWeight && <span className="text-sm text-slate-400 ml-1">g</span>}
              {isWeight && <span className="text-xs text-slate-500 ml-2 font-normal">(Pure)</span>}
            </div>
            {grossMainValue !== undefined && (
              <div className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                {grossMainValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm text-slate-400 ml-1">g</span>
                <span className="text-xs text-slate-500 ml-2 font-normal">(Gross)</span>
              </div>
            )}
            {mainByType && Object.keys(mainByType).length > 0 && (
              <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                {Object.entries(mainByType).map(([type, data]: any) => (
                  <div key={type} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{type}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{data.pureWeight.toFixed(2)}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Normal Branches</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isCurrency && <span className="text-sm text-slate-400 mr-1">{currency}</span>}
              {normalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {isWeight && <span className="text-sm text-slate-400 ml-1">g</span>}
              {isWeight && <span className="text-xs text-slate-500 ml-2 font-normal">(Pure)</span>}
            </div>
            {grossNormalValue !== undefined && (
              <div className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                {grossNormalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm text-slate-400 ml-1">g</span>
                <span className="text-xs text-slate-500 ml-2 font-normal">(Gross)</span>
              </div>
            )}
            {normalByType && Object.keys(normalByType).length > 0 && (
              <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                {Object.entries(normalByType).map(([type, data]: any) => (
                  <div key={type} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{type}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{data.pureWeight.toFixed(2)}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6 w-full">
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card 
          title="Stock Ready (Weight)" 
          mainValue={stats.mainStockWeight} 
          normalValue={stats.normalStockWeight} 
          grossMainValue={stats.mainStockGrossWeight}
          grossNormalValue={stats.normalStockGrossWeight}
          mainByType={stats.mainStockByType}
          normalByType={stats.normalStockByType}
          icon={Scale} 
          isWeight={true}
        />
        
        <Card 
          title="Stock Ready (Making Value)" 
          mainValue={stats.mainStockMakingCharge} 
          normalValue={stats.normalStockMakingCharge} 
          icon={Pickaxe} 
          isCurrency={true}
        />
        
        <Card 
          title="Current Cash Balances" 
          mainValue={stats.mainCashBalance} 
          normalValue={stats.normalCashBalance} 
          icon={Landmark} 
          isCurrency={true}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-xl">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C28C46]/10 rounded-full blur-3xl"></div>
          <h3 className="text-slate-400 font-medium flex items-center gap-2 mb-4 relative z-10">
            <DollarSign className="w-5 h-5 text-[#C28C46]"/> Making Collected (Normal Branches)
          </h3>
          <h2 className="text-5xl font-extrabold text-white tracking-tight relative z-10">
            <span className="text-2xl text-slate-500 font-medium mr-2">{currency}</span>
            {stats.normalMakingCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-xl">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <h3 className="text-slate-400 font-medium flex items-center gap-2 mb-4 relative z-10">
            <DollarSign className="w-5 h-5 text-emerald-400"/> Total Making Collected (Global)
          </h3>
          <h2 className="text-5xl font-extrabold text-white tracking-tight relative z-10">
            <span className="text-2xl text-slate-500 font-medium mr-2">{currency}</span>
            {stats.totalMakingCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

    </div>
  );
};

export default OwnerOverview;
