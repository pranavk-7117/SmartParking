import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  siteName?: string;
  dateRange?: string;
  summaryStats?: { label: string; value: string | number }[];
  headers: string[];
  rows: (string | number)[][];
}

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]): void => {
  const headerLine = headers.map((h) => '"' + h.replace(/"/g, '""') + '"').join(',');
  const rowLines = rows.map((row) =>
    row.map((val) => {
      const s = String(val !== null && val !== undefined ? val : '');
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(',')
  );

  const csvContent = [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : filename + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = (options: PDFExportOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 595.28, 65, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AeroPark Smart Parking Management', 40, 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title || 'Operational Report', 40, 50);

  let startY = 85;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  if (options.siteName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Site: ' + options.siteName, 40, startY);
    doc.setFont('helvetica', 'normal');
    startY += 14;
  }
  if (options.dateRange) {
    doc.text('Date Scope: ' + options.dateRange, 40, startY);
    startY += 14;
  }
  doc.text('Generated: ' + new Date().toLocaleString('en-GB'), 40, startY);
  startY += 16;

  // Summary Stat Cards
  if (options.summaryStats && options.summaryStats.length > 0) {
    const cardWidth = Math.min(110, (515 / options.summaryStats.length) - 8);
    options.summaryStats.forEach((stat, i) => {
      const x = 40 + i * (cardWidth + 8);
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, startY, cardWidth, 38, 4, 4, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(stat.label, x + 8, startY + 14);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(String(stat.value), x + 8, startY + 30);
      doc.setFont('helvetica', 'normal');
    });
    startY += 50;
  }

  // Data Table
  autoTable(doc, {
    startY:
      startY,
    head: [options.headers],
    body: options.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 40, right: 40 },
  });

  // Direct download trigger (no print dialog)
  const fname = options.filename.endsWith('.pdf') ? options.filename : options.filename + '.pdf';
  doc.save(fname);
};
