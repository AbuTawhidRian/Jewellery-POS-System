import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../store/InventoryContext';
import { Save, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const DailyRates: React.FC = () => {
  const { hasPermission } = useAuth();
  const { itemTypes } = useInventory();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get('/gold_rates');
        const data = res.data;
        if (Array.isArray(data)) {
          const newRates: Record<string, number> = {};
          data.forEach(r => {
            newRates[r.type] = r.rate;
          });
          setRates(newRates);
        }
      } catch (err) {
        console.error("Failed to fetch rates", err);
      }
    };
    fetchRates();
  }, []);

  const handleRateChange = (type: string, value: string) => {
    const parsed = parseFloat(value);
    setRates(prev => ({
      ...prev,
      [type]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleSave = async (type: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post('/gold_rates', { type, rate: rates[type] || 0 });
      setSuccessMessage(`Rate for ${type} updated successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update rate');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('edit_vault')) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to view or manage daily rates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Daily Gold Rates</h1>
      
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Gold Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Rate (per gram)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {itemTypes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No Item Types configured yet. Add them in Inventory settings.
                </td>
              </tr>
            ) : (
              itemTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {type.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">DH</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rates[type.name] === undefined ? '' : rates[type.name]}
                        onChange={(e) => handleRateChange(type.name, e.target.value)}
                        className="block w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleSave(type.name)}
                      disabled={loading || rates[type.name] === undefined}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyRates;
