import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, addCircularDecorations, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  studentId: string;
  className?: string;
  feeName: string;
  feeType: string;
  paymentAmount: number;
  paymentMethod: string;
  transactionId?: string;
  totalFeeAmount: number;
  previouslyPaid: number;
  balanceAfterPayment: number;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

export const generateReceiptPdf = async (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Add watermark first (behind everything)
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
  
  // Circular logo container with gold ring
  if (logoImg) {
    const logoSize = 34;
    const logoX = 10;
    const logoY = 8;
    
    // Gold ring around logo
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    // White circle background
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
  
  // Receipt title
  doc.setTextColor(...darkColor);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", pageWidth - 20, 72, { align: "right" });
  
  // Receipt details box with rounded corners
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(pageWidth - 92, 78, 72, 30, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 92, 78, 72, 30, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Receipt Number:", pageWidth - 87, 88);
  doc.text("Payment Date:", pageWidth - 87, 96);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.receiptNumber, pageWidth - 25, 88, { align: "right" });
  doc.text(data.paymentDate, pageWidth - 25, 96, { align: "right" });
  
  // Received From section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("RECEIVED FROM", 20, 82);
  
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
  
  // Payment confirmation badge with circular design
  doc.setFillColor(...primaryColor);
  doc.roundedRect(20, 115, 55, 14, 7, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT CONFIRMED", 47.5, 124, { align: "center" });
  
  // Payment details table
  autoTable(doc, {
    startY: 142,
    head: [["Description", "Fee Type", "Payment Method", "Amount Paid"]],
    body: [
      [
        data.feeName, 
        data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1),
        data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1).replace("_", " "),
        `PKR ${data.paymentAmount.toLocaleString()}`
      ],
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
      0: { cellWidth: 50 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });
  
  // Summary section
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  
  // Summary box with gold accent
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(pageWidth - 97, finalY, 77, 52, 3, 3, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - 97, finalY, 77, 52, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  
  let yPos = finalY + 12;
  doc.text("Total Fee Amount:", pageWidth - 92, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`PKR ${data.totalFeeAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 10;
  doc.setTextColor(...grayColor);
  doc.text("Previously Paid:", pageWidth - 92, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`PKR ${data.previouslyPaid.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 10;
  doc.setTextColor(...grayColor);
  doc.text("This Payment:", pageWidth - 92, yPos);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(`PKR ${data.paymentAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Balance due line
  yPos += 14;
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(pageWidth - 92, yPos - 4, pageWidth - 25, yPos - 4);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (data.balanceAfterPayment <= 0) {
    doc.setTextColor(34, 139, 34);
    doc.text("FULLY PAID", pageWidth - 92, yPos);
    doc.text("PKR 0", pageWidth - 25, yPos, { align: "right" });
  } else {
    doc.setTextColor(234, 179, 8);
    doc.text("Balance Due:", pageWidth - 92, yPos);
    doc.text(`PKR ${data.balanceAfterPayment.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  }
  
  // Transaction details if available
  if (data.transactionId) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(`Transaction ID: ${data.transactionId}`, 20, finalY + 10);
  }
  
  // Apply footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");
  
  return doc;
};

export const downloadReceipt = async (data: ReceiptData) => {
  const doc = await generateReceiptPdf(data);
  doc.save(`Receipt-${data.receiptNumber}.pdf`);
};

export const printReceipt = async (data: ReceiptData) => {
  const doc = await generateReceiptPdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
