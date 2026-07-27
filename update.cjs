const fs = require('fs');
const path = require('path');

const filePath = path.join('e:', 'E_drive', 'Rian', 'Next Js', 'Jewellery Management', 'src', 'pages', 'BranchSettlement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  "import { ArrowRightLeft, AlertCircle, Save, CheckCircle, XCircle } from 'lucide-react';",
  `import { ArrowRightLeft, AlertCircle, Save, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';\nimport * as XLSX from 'xlsx';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';`
);

// 2. States
const stateAnchor = "const [submitting, setSubmitting] = useState(false);";
const newStates = `  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 7;

  useEffect(() => {
    setCurrentPage(1);
    setStartDate('');
    setEndDate('');
  }, [activeTab]);`;

content = content.replace(stateAnchor, stateAnchor + '\n\n' + newStates);

// 3. Derived logic and exports
const logicAnchor = "const activeTransfers = activeTab === 'cash' ? cashTransfers : goldTransfers;";
const newLogic = `  const activeTransfers = activeTab === 'cash' ? cashTransfers : goldTransfers;

  const filteredTransfers = activeTransfers.filter((t) => {
    if (!startDate && !endDate) return true;
    const tDate = new Date(t.date);
    tDate.setHours(0, 0, 0, 0);
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (tDate < sDate) return false;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(0, 0, 0, 0);
      if (tDate > eDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    const data = filteredTransfers.map(t => ({
      Date: new Date(t.date).toLocaleString(),
      From: t.fromBranch?.name || 'Unknown',
      To: t.toBranch?.name || 'Unknown',
      [activeTab === 'cash' ? 'Amount' : 'Weight (g)']: activeTab === 'cash' ? Number(t.amount).toFixed(2) : Number(t.weight).toFixed(2),
      Status: t.status,
      Notes: t.notes || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Settlements");
    XLSX.writeFile(wb, \`\${activeTab}_settlements.xlsx\`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(\`\${activeTab === 'cash' ? 'Cash' : 'Gold'} Settlement History\`, 14, 15);
    
    const tableColumn = ["Date", "From", "To", activeTab === 'cash' ? "Amount" : "Weight (g)", "Status", "Notes"];
    const tableRows = filteredTransfers.map(t => [
      new Date(t.date).toLocaleString(),
      t.fromBranch?.name || 'Unknown',
      t.toBranch?.name || 'Unknown',
      activeTab === 'cash' ? Number(t.amount).toFixed(2) : Number(t.weight).toFixed(2),
      t.status,
      t.notes || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });
    
    doc.save(\`\${activeTab}_settlements.pdf\`);
  };`;

content = content.replace(logicAnchor, newLogic);

// 4. Filter Bar & Table Mapping
const renderAnchorStart = `            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeTab === 'cash' ? 'Cash Payment History' : 'Gold Transfer History'}
              </h2>
            </div>`;
const newRender = `            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeTab === 'cash' ? 'Cash Payment History' : 'Gold Transfer History'}
              </h2>
            </div>

            {/* Filter and Export Bar */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                    className="text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-1.5 focus:ring-[#C28C46] focus:border-[#C28C46]"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                    className="text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-1.5 focus:ring-[#C28C46] focus:border-[#C28C46]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>`;

content = content.replace(renderAnchorStart, newRender);

// Replace mapping logic
content = content.replace(/activeTransfers\.length === 0/g, "filteredTransfers.length === 0");
content = content.replace(/activeTransfers\.map/g, "paginatedTransfers.map");

// Add pagination controls at the end of the table
const tableEnd = `              </table>
            </div>
          </div>
        </div>
      </div>`;

const newTableEnd = `              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransfers.length)} of {filteredTransfers.length} entries
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>`;

content = content.replace(tableEnd, newTableEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated BranchSettlement.tsx");
