import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  studentName: string;
  studentId: string;
  className?: string;
  feeName: string;
  feeType: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  status: string;
  payments: {
    date: string;
    amount: number;
    method: string;
    receiptNumber: string | null;
  }[];
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}


export const generateInvoicePdf = async (data: InvoiceData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 50, pageWidth, 3, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 20, 15, 30, 'F');
  doc.circle(pageWidth - 50, -5, 20, 'F');
  doc.circle(25, 40, 15, 'F');
  
  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 34;
    const logoX = 10;
    const logoY = 8;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", 52, 20);
  
  // School info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", 52, 28);
  doc.text(`Phone: ${data.schoolPhone || "+92 000 000 0000"} | Email: ${data.schoolEmail || "info@suffah.edu.pk"}`, 52, 36);
  
  // Invoice title
  doc.setTextColor(...darkColor);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 72, { align: "right" });
  
  // Invoice details box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(pageWidth - 92, 78, 72, 38, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 92, 78, 72, 38, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Invoice Number:", pageWidth - 87, 88);
  doc.text("Invoice Date:", pageWidth - 87, 96);
  doc.text("Due Date:", pageWidth - 87, 104);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, pageWidth - 25, 88, { align: "right" });
  doc.text(data.invoiceDate, pageWidth - 25, 96, { align: "right" });
  doc.text(data.dueDate, pageWidth - 25, 104, { align: "right" });
  
  // Bill To section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BILL TO", 20, 82);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName, 20, 92);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`Student ID: ${data.studentId}`, 20, 99);
  if (data.className) {
    doc.text(`Class: ${data.className}`, 20, 106);
  }
  
  // Status badge (circular design)
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 139, 34],
    partial: [234, 179, 8],
    pending: [148, 163, 184],
    overdue: [239, 68, 68],
  };
  const statusColor = statusColors[data.status] || statusColors.pending;
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 57, 120, 37, 12, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.status.toUpperCase(), pageWidth - 38.5, 128, { align: "center" });
  
  // Fee details table
  autoTable(doc, {
    startY: 140,
    head: [["Description", "Fee Type", "Amount"]],
    body: [
      [data.feeName, data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), `PKR ${data.amount.toLocaleString()}`],
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });
  
  // Totals section
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  
  // Totals box with gold border
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(pageWidth - 92, finalY, 72, 48, 3, 3, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - 92, finalY, 72, 48, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  
  let yPos = finalY + 10;
  doc.text("Subtotal:", pageWidth - 87, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`PKR ${data.amount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Discount:", pageWidth - 87, yPos);
  doc.setTextColor(...primaryColor);
  doc.text(`-PKR ${data.discount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Paid:", pageWidth - 87, yPos);
  doc.setTextColor(34, 139, 34);
  doc.text(`-PKR ${data.paidAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Total due line
  yPos += 14;
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(pageWidth - 87, yPos - 4, pageWidth - 25, yPos - 4);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Balance Due:", pageWidth - 87, yPos);
  const balance = Math.max(0, data.finalAmount - data.paidAmount);
  doc.text(`PKR ${balance.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Payment history if exists
  if (data.payments.length > 0) {
    const paymentStartY = finalY + 60;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Payment History", 20, paymentStartY);
    
    autoTable(doc, {
      startY: paymentStartY + 5,
      head: [["Date", "Amount", "Method", "Receipt #"]],
      body: data.payments.map((p) => [
        p.date,
        `PKR ${p.amount.toLocaleString()}`,
        p.method.charAt(0).toUpperCase() + p.method.slice(1),
        p.receiptNumber || "-",
      ]),
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor,
      },
      margin: { left: 20, right: 20 },
    });
  }
  
  // Apply footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");
  
  return doc;
};

export const downloadInvoice = async (data: InvoiceData) => {
  const doc = await generateInvoicePdf(data);
  doc.save(`Invoice-${data.invoiceNumber}.pdf`);
};

export const printInvoice = async (data: InvoiceData) => {
  const doc = await generateInvoicePdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
