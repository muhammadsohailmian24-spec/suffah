import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

interface SubjectResult {
  name: string;
  maxMarks: number;
  marksObtained: number;
  grade?: string;
}

export interface MarksCertificateData {
  studentName: string;
  fatherName?: string;
  studentId: string;
  rollNumber?: string;
  className: string;
  section?: string;
  group?: string;
  session: string;
  dateOfBirth?: string;
  examName: string;
  examMonth?: string;
  subjects: SubjectResult[];
  photoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
  resultDate?: string;
  preparedBy?: string;
}

const convertToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertToWords(num % 100) : '');
  if (num < 10000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convertToWords(num % 1000) : '');
  return String(num);
};

const formatDateToWords = (dateStr?: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    return `${ordinal(day)} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const generateMarksCertificatePdf = async (data: MarksCertificateData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Add watermark
  await addWatermark(doc);

  // Photo box (right side) with gold ring
  const photoX = pageWidth - rightMargin - 30;
  const photoY = 12;
  const photoWidth = 28;
  const photoHeight = 35;

  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(photoX - 2, photoY - 2, photoWidth + 4, photoHeight + 4, 3, 3, "S");
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoWidth, photoHeight);

  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  }

  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 25;
    const logoX = leftMargin;
    const logoY = 8;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // Header - School Name
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2 + 10, 18, { align: "center" });

  // School Address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "MADYAN SWAT, PAKISTAN", pageWidth / 2 + 10, 26, { align: "center" });

  // Certificate Title with decorative line
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("PROVISIONAL AND DETAILED MARKS CERTIFICATE", pageWidth / 2, 38, { align: "center" });

  // Exam Name
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text(data.examName.toUpperCase(), pageWidth / 2, 46, { align: "center" });

  // Horizontal line under header with gold accent
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(leftMargin, 50, pageWidth - rightMargin, 50);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, 52, pageWidth - rightMargin, 52);

  // Session and Group - centered
  let yPos = 60;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Session:", pageWidth / 2 - 25, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.session, pageWidth / 2, yPos);

  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Group:", pageWidth / 2 - 25, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(`(${data.group || data.className})`, pageWidth / 2, yPos);

  // Student details section
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);

  // Row 1: Name and Enroll No
  doc.text("This is to certify that", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, leftMargin + 42, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Enroll No:", pageWidth - rightMargin - 55, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentId, pageWidth - rightMargin - 30, yPos);

  // Row 2: Father's Name and Roll No
  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("Son/Daughter of", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.fatherName || "-", leftMargin + 42, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Roll No:", pageWidth - rightMargin - 55, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.rollNumber || data.studentId, pageWidth - rightMargin - 30, yPos);

  // Certification text
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  const certText = `has secured the marks shown against each subject in the ${data.examName} held in the month of ${data.examMonth || "examination"}.`;
  doc.text(certText, leftMargin, yPos, { maxWidth: contentWidth });

  // Marks table
  yPos += 10;

  // Calculate totals
  const totalMaxMarks = data.subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  const totalObtained = data.subjects.reduce((sum, sub) => sum + sub.marksObtained, 0);

  autoTable(doc, {
    startY: yPos,
    head: [["S.No", "Subject", "Max Marks", "Marks Obtained", "In Words"]],
    body: [
      ...data.subjects.map((sub, index) => [
        String(index + 1),
        sub.name,
        String(sub.maxMarks),
        String(sub.marksObtained),
        convertToWords(sub.marksObtained),
      ]),
      ["", "TOTAL", String(totalMaxMarks), String(totalObtained), convertToWords(totalObtained)],
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 48 },
    },
    margin: { left: leftMargin, right: rightMargin },
    theme: "grid",
    didParseCell: (data) => {
      // Make the total row bold with gold background
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [255, 248, 220];
      }
    },
  });

  // Date of Birth section
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Date of Birth (In Figures):", leftMargin, tableEndY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.dateOfBirth || "-", leftMargin + 48, tableEndY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("(In Words):", leftMargin + 20, tableEndY + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(formatDateToWords(data.dateOfBirth), leftMargin + 48, tableEndY + 7);

  // Bottom section with prepared by and controller
  const bottomY = tableEndY + 22;
  
  // Left side - Prepared by
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Prepared and Checked by:", leftMargin, bottomY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.preparedBy || "SCHOOL ADMINISTRATION", leftMargin, bottomY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Date Prepared:", leftMargin, bottomY + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 30, bottomY + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Result Declaration Date:", leftMargin, bottomY + 21);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.resultDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 45, bottomY + 21);

  // Right side - Controller of Examination with circular seal
  const rightSideX = pageWidth - rightMargin - 60;
  
  // Circular seal
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.circle(rightSideX + 30, bottomY + 5, 12);
  doc.setFontSize(6);
  doc.setTextColor(...primaryColor);
  doc.text("OFFICIAL", rightSideX + 30, bottomY + 4, { align: "center" });
  doc.text("SEAL", rightSideX + 30, bottomY + 8, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("________________________", rightSideX, bottomY + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text("Controller of Examination", rightSideX + 5, bottomY + 26);

  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");

  return doc;
};

export const downloadMarksCertificate = async (data: MarksCertificateData) => {
  const doc = await generateMarksCertificatePdf(data);
  doc.save(`MarksCertificate-${data.studentId}.pdf`);
};
