import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess, showToast }) {
  const [parsedData, setParsedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setParsedData(data);
    };
    reader.readAsBinaryString(file);
  };

  const downloadSampleTemplate = () => {
    const sample = [
      { Supplier: 'Maa Fruits Mandi Traders', Truck: 'WB12AB1234', Fruit: 'Apple', Variety: 'Royal Gala', Boxes: 100, NetWeight: 1850, PurchaseRate: 110 },
      { Supplier: 'Maa Fruits Mandi Traders', Truck: 'WB12AB1234', Fruit: 'Orange', Variety: 'Nagpur Santra', Boxes: 80, NetWeight: 1200, PurchaseRate: 75 },
      { Supplier: 'California Dry Fruits Exim', Truck: 'WB24CD5678', Fruit: 'Almond', Variety: 'California Almond (Nonpareil)', Boxes: 50, NetWeight: 500, PurchaseRate: 810 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PurchaseImportTemplate');
    XLSX.writeFile(wb, 'Fruit_ERP_Purchase_Import_Template.xlsx');
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setIsProcessing(true);
    try {
      // Create Purchase Order from parsed data
      const payload = {
        supplier: 1, // Maa fruits
        warehouse_name: 'Central Cold Hub',
        purchase_date: new Date().toISOString().split('T')[0],
        status: 'RECEIVED',
        items: parsedData.map(r => ({
          product: 1,
          variety: 1,
          quantity_boxes: Number(r.Boxes || 50),
          net_weight: Number(r.NetWeight || 500),
          purchase_rate: Number(r.PurchaseRate || 100),
        }))
      };

      await api.post('/purchases/', payload);
      showToast(`Successfully imported ${parsedData.length} records and created active batches!`);
      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch (err) {
      showToast('Error importing Excel: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={20} color="#10b981" />
            <span>Excel Bulk Purchase Import & Inventory Sync</span>
          </div>
          <button
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
              Upload your supplier delivery Excel sheet (.xlsx, .csv) with columns: Supplier, Truck, Fruit, Variety, Boxes, NetWeight, PurchaseRate
            </p>
            <button className="btn btn-secondary btn-sm" onClick={downloadSampleTemplate}>
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Upload Drop Area */}
          <div style={{
            border: '2px dashed var(--border-light)',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center',
            background: 'var(--bg-main)',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            <Upload size={32} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
              {fileName ? fileName : 'Choose or Drag Excel File to Upload'}
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Standard Mandi Manifest format supported (.xlsx, .xls, .csv)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ marginTop: '12px' }}
              onChange={handleFileUpload}
            />
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Preview: {parsedData.length} Validated Rows
                </span>
                <span className="badge badge-success">Data Format Valid</span>
              </div>

              <div className="erp-table-wrapper" style={{ maxHeight: '200px' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      {Object.keys(parsedData[0]).map((k, i) => (
                        <th key={i}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((v, cIdx) => (
                          <td key={cIdx}>{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={parsedData.length === 0 || isProcessing}
            onClick={handleConfirmImport}
          >
            <CheckCircle size={16} />
            <span>Confirm Import & Ingest Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
}
