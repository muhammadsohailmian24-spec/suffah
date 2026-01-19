import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor, lightGray } from "./pdfDesignUtils";

interface AttendanceRecord {
  date: string;
  status: string;
}

interface StudentAttendance {
  studentId: string;
  studentName: string;
  fatherName: string;
  rollNumber: string;
  attendance: AttendanceRecord[];
}

interface ClassAttendanceData {
  className: string;
  section: string | null;
  month: Date;
  students: StudentAttendance[];
  schoolName?: string;
  schoolAddress?: string;
}

interface IndividualAttendanceData {
  studentId: string;
  studentName: string;
  fatherName: string;
  rollNumber: string;
  className: string;
  section: string | null;
  month: Date;
  attendance: AttendanceRecord[];
  photoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
}

const getStatusSymbol = (status: string): string => {
  switch (status.toLowerCase()) {
    case "present": return "P";
    case "absent": return "A";
    case "late": return "L";
    case "excused": return "E";
    default: return "-";
  }
};

const getStatusColor = (status: string): [number, number, number] => {
  switch (status.toLowerCase()) {
    case "present": return [34, 139, 34];
    case "absent": return [220, 53, 69];
    case "late": return [255, 165, 0];
    case "excused": return [70, 130, 180];
    default: return grayColor;
  }
};

export const generateClassMonthlyAttendancePdf = async (data: ClassAttendanceData): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  const monthStart = startOfMonth(data.month);
  const monthEnd = endOfMonth(data.month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const schoolName = data.schoolName || "The Suffah Public School & College";
  const schoolAddress = data.schoolAddress || "Madyan Swat, Pakistan";
  const classTitle = `${data.className}${data.section ? ` - ${data.section}` : ""}`;
  
  // Add watermark
  await addWatermark(doc);
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 2, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 25, 12, 28, 'F');
  doc.circle(pageWidth - 55, -8, 20, 'F');
  doc.circle(30, 32, 15, 'F');
  
  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 30;
    const logoX = 12;
    const logoY = 6;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, pageWidth / 2 + 12, 14, { align: "center" });

  // School address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, pageWidth / 2 + 12, 23, { align: "center" });

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("MONTHLY ATTENDANCE REGISTER", pageWidth / 2 + 12, 33, { align: "center" });

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Class: ${classTitle} | Month: ${format(data.month, "MMMM yyyy")}`, pageWidth / 2 + 12, 40, { align: "center" });

  // Create table headers
  const dayHeaders = daysInMonth.map(day => format(day, "d"));
  const headers = ["#", "Roll No.", "Student Name", "Father Name", ...dayHeaders, "P", "A", "L", "E", "%"];

  // Create table body
  const tableBody = data.students.map((student, index) => {
    const attendanceMap = new Map(student.attendance.map(a => [a.date, a.status]));
    
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    
    const dailyAttendance = daysInMonth.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const status = attendanceMap.get(dateStr) || "-";
      
      if (status === "present") presentCount++;
      else if (status === "absent") absentCount++;
      else if (status === "late") lateCount++;
      else if (status === "excused") excusedCount++;
      
      return getStatusSymbol(status);
    });
    
    const totalMarked = presentCount + absentCount + lateCount + excusedCount;
    const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
    
    return [
      String(index + 1),
      student.rollNumber || student.studentId,
      student.studentName,
      student.fatherName || "-",
      ...dailyAttendance,
      String(presentCount),
      String(absentCount),
      String(lateCount),
      String(excusedCount),
      `${percentage}%`
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [headers],
    body: tableBody,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: darkColor,
      halign: "center",
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 30, halign: "left" },
      3: { cellWidth: 28, halign: "left" },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 8, right: 8 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index >= 4 && hookData.column.index < 4 + daysInMonth.length) {
        const cellText = hookData.cell.text[0];
        if (cellText === "P") hookData.cell.styles.textColor = [34, 139, 34];
        else if (cellText === "A") hookData.cell.styles.textColor = [220, 53, 69];
        else if (cellText === "L") hookData.cell.styles.textColor = [255, 165, 0];
        else if (cellText === "E") hookData.cell.styles.textColor = [70, 130, 180];
      }
      if (hookData.section === "body" && hookData.column.index === headers.length - 1) {
        const percentage = parseInt(hookData.cell.text[0]);
        if (percentage >= 90) hookData.cell.styles.textColor = [34, 139, 34];
        else if (percentage >= 75) hookData.cell.styles.textColor = [255, 165, 0];
        else hookData.cell.styles.textColor = [220, 53, 69];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Legend with circular markers
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Legend:", 10, finalY);
  
  const legendItems = [
    { symbol: "P", label: "Present", color: [34, 139, 34] as [number, number, number] },
    { symbol: "A", label: "Absent", color: [220, 53, 69] as [number, number, number] },
    { symbol: "L", label: "Late", color: [255, 165, 0] as [number, number, number] },
    { symbol: "E", label: "Excused", color: [70, 130, 180] as [number, number, number] },
  ];
  
  let legendX = 28;
  legendItems.forEach(item => {
    // Circular marker
    doc.setFillColor(...item.color);
    doc.circle(legendX, finalY - 1.5, 2, 'F');
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...item.color);
    doc.text(`${item.symbol} = ${item.label}`, legendX + 5, finalY);
    legendX += 38;
  });

  // Summary
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Students: ${data.students.length}`, pageWidth - 60, finalY);

  // Apply styled footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawStyledFooter(doc, i, totalPages, schoolAddress);
  }

  return doc;
};

export const generateIndividualMonthlyAttendancePdf = async (data: IndividualAttendanceData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  const monthStart = startOfMonth(data.month);
  const monthEnd = endOfMonth(data.month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const schoolName = data.schoolName || "The Suffah Public School & College";
  const schoolAddress = data.schoolAddress || "Madyan Swat, Pakistan";
  const classTitle = `${data.className}${data.section ? ` - ${data.section}` : ""}`;
  
  // Add watermark
  await addWatermark(doc);
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 45, pageWidth, 3, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 20, 12, 25, 'F');
  doc.circle(pageWidth - 45, -5, 18, 'F');
  doc.circle(25, 38, 12, 'F');
  
  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 32;
    const logoX = 12;
    const logoY = 7;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, pageWidth / 2 + 12, 16, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, pageWidth / 2 + 12, 25, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("MONTHLY ATTENDANCE REPORT", pageWidth / 2 + 12, 36, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Month: ${format(data.month, "MMMM yyyy")}`, pageWidth / 2 + 12, 43, { align: "center" });

  // Student photo box with gold border
  const photoX = pageWidth - 50;
  const photoY = 55;
  const photoWidth = 30;
  const photoHeight = 38;
  
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
          doc.addImage(img, "JPEG", photoX, photoY, photoWidth, photoHeight);
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
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
  }

  // Student details card
  let yPos = 58;
  const leftMargin = 15;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(leftMargin - 3, yPos - 5, pageWidth - photoWidth - 48, 45, 3, 3, "F");
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  
  const details = [
    { label: "Student Name:", value: data.studentName },
    { label: "Father's Name:", value: data.fatherName || "-" },
    { label: "Roll Number:", value: data.rollNumber || data.studentId },
    { label: "Class:", value: classTitle },
  ];

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, leftMargin + 38, yPos);
    yPos += 9;
  });

  // Calculate statistics
  const attendanceMap = new Map(data.attendance.map(a => [a.date, a.status]));
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  daysInMonth.forEach(day => {
    const status = attendanceMap.get(format(day, "yyyy-MM-dd"));
    if (status === "present") presentCount++;
    else if (status === "absent") absentCount++;
    else if (status === "late") lateCount++;
    else if (status === "excused") excusedCount++;
  });

  const totalMarked = presentCount + absentCount + lateCount + excusedCount;
  const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  // Statistics cards
  yPos = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("ATTENDANCE SUMMARY", leftMargin, yPos);

  yPos += 8;
  const cardWidth = 40;
  const cardHeight = 28;
  const cardGap = 5;

  const statsCards = [
    { label: "Present", value: presentCount, color: [34, 139, 34] as [number, number, number] },
    { label: "Absent", value: absentCount, color: [220, 53, 69] as [number, number, number] },
    { label: "Late", value: lateCount, color: [255, 165, 0] as [number, number, number] },
    { label: "Excused", value: excusedCount, color: [70, 130, 180] as [number, number, number] },
  ];

  statsCards.forEach((stat, index) => {
    const x = leftMargin + index * (cardWidth + cardGap);
    
    doc.setFillColor(...stat.color);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(stat.value), x + cardWidth / 2, yPos + 14, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, x + cardWidth / 2, yPos + 22, { align: "center" });
  });

  // Percentage circle
  const circleX = leftMargin + 4 * (cardWidth + cardGap) + 20;
  const circleRadius = 14;
  
  const percColor = percentage >= 90 ? [34, 139, 34] : percentage >= 75 ? [255, 165, 0] : [220, 53, 69];
  doc.setDrawColor(...(percColor as [number, number, number]));
  doc.setLineWidth(2);
  doc.circle(circleX, yPos + cardHeight / 2, circleRadius);
  
  doc.setTextColor(...(percColor as [number, number, number]));
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${percentage}%`, circleX, yPos + cardHeight / 2 + 2, { align: "center" });
  
  doc.setFontSize(7);
  doc.text("Attendance", circleX, yPos + cardHeight / 2 + 10, { align: "center" });

  // Daily attendance calendar
  yPos += cardHeight + 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("DAILY ATTENDANCE RECORD", leftMargin, yPos);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOfMonth = monthStart.getDay();
  
  const calendarRows: string[][] = [];
  let currentRow: string[] = [];
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentRow.push("");
  }
  
  daysInMonth.forEach((day, index) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const status = attendanceMap.get(dateStr);
    const dayNum = format(day, "d");
    const symbol = status ? getStatusSymbol(status) : "-";
    currentRow.push(`${dayNum}\n${symbol}`);
    
    if ((firstDayOfMonth + index + 1) % 7 === 0) {
      calendarRows.push([...currentRow]);
      currentRow = [];
    }
  });
  
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push("");
    }
    calendarRows.push(currentRow);
  }

  autoTable(doc, {
    startY: yPos + 5,
    head: [weekdays],
    body: calendarRows,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      halign: "center",
      valign: "middle",
      minCellHeight: 12,
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      6: { cellWidth: 24 },
    },
    margin: { left: leftMargin, right: leftMargin },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const cellText = hookData.cell.text.join("");
        if (cellText.includes("P")) hookData.cell.styles.textColor = [34, 139, 34];
        else if (cellText.includes("A")) hookData.cell.styles.textColor = [220, 53, 69];
        else if (cellText.includes("L")) hookData.cell.styles.textColor = [255, 165, 0];
        else if (cellText.includes("E")) hookData.cell.styles.textColor = [70, 130, 180];
      }
    },
  });

  // Apply styled footer
  drawStyledFooter(doc, 1, 1, schoolAddress);

  return doc;
};

export const downloadClassMonthlyAttendancePdf = async (data: ClassAttendanceData) => {
  const doc = await generateClassMonthlyAttendancePdf(data);
  doc.save(`Attendance-${data.className.replace(/\s+/g, "-")}-${format(data.month, "MMMM-yyyy")}.pdf`);
};

export const downloadIndividualMonthlyAttendancePdf = async (data: IndividualAttendanceData) => {
  const doc = await generateIndividualMonthlyAttendancePdf(data);
  doc.save(`Attendance-${data.studentName.replace(/\s+/g, "-")}-${format(data.month, "MMMM-yyyy")}.pdf`);
};
