import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval, endOfMonth } from "date-fns";

// Colors - Royal Blue theme (matching school branding)
const primaryColor: [number, number, number] = [30, 100, 180];
const goldColor: [number, number, number] = [180, 140, 50];
const darkColor: [number, number, number] = [30, 30, 30];
const grayColor: [number, number, number] = [100, 100, 100];
const lightGray: [number, number, number] = [240, 240, 240];

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

const loadLogo = async (): Promise<HTMLImageElement | null> => {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
    return logoImg;
  } catch (e) {
    return null;
  }
};

const drawHeader = (doc: jsPDF, logoImg: HTMLImageElement | null, title: string, subtitle: string, schoolName: string, schoolAddress: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Gold accent line
  doc.setFillColor(...goldColor);
  doc.rect(0, 45, pageWidth, 3, "F");

  // Add logo
  if (logoImg) {
    doc.addImage(logoImg, "PNG", 12, 7, 32, 32);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, pageWidth / 2 + 10, 16, { align: "center" });

  // School address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, pageWidth / 2 + 10, 24, { align: "center" });

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2 + 10, 34, { align: "center" });

  // Subtitle (month/class info)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageWidth / 2 + 10, 42, { align: "center" });
};

const drawFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Footer line
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  
  // Page number
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: "center" });
  
  // Print date
  doc.text(`Generated on: ${format(new Date(), "PPP 'at' p")}`, 15, pageHeight - 12);
  
  // Signature lines
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.line(15, pageHeight - 30, 55, pageHeight - 30);
  doc.line(pageWidth - 55, pageHeight - 30, pageWidth - 15, pageHeight - 30);
  doc.text("Class Teacher", 25, pageHeight - 25);
  doc.text("Principal", pageWidth - 45, pageHeight - 25);
};

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
    case "present": return [34, 139, 34]; // Green
    case "absent": return [220, 53, 69]; // Red
    case "late": return [255, 165, 0]; // Orange
    case "excused": return [70, 130, 180]; // Steel blue
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
  
  drawHeader(
    doc, 
    logoImg, 
    "MONTHLY ATTENDANCE REGISTER", 
    `Class: ${classTitle} | Month: ${format(data.month, "MMMM yyyy")}`,
    schoolName,
    schoolAddress
  );

  // Create table headers - days of the month
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
    startY: 55,
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
      // Color code attendance cells
      if (hookData.section === "body" && hookData.column.index >= 4 && hookData.column.index < 4 + daysInMonth.length) {
        const cellText = hookData.cell.text[0];
        if (cellText === "P") hookData.cell.styles.textColor = [34, 139, 34];
        else if (cellText === "A") hookData.cell.styles.textColor = [220, 53, 69];
        else if (cellText === "L") hookData.cell.styles.textColor = [255, 165, 0];
        else if (cellText === "E") hookData.cell.styles.textColor = [70, 130, 180];
      }
      // Style the percentage column
      if (hookData.section === "body" && hookData.column.index === headers.length - 1) {
        const percentage = parseInt(hookData.cell.text[0]);
        if (percentage >= 90) hookData.cell.styles.textColor = [34, 139, 34];
        else if (percentage >= 75) hookData.cell.styles.textColor = [255, 165, 0];
        else hookData.cell.styles.textColor = [220, 53, 69];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Add legend
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Legend:", 10, finalY);
  
  doc.setFont("helvetica", "normal");
  const legendItems = [
    { symbol: "P", label: "Present", color: [34, 139, 34] as [number, number, number] },
    { symbol: "A", label: "Absent", color: [220, 53, 69] as [number, number, number] },
    { symbol: "L", label: "Late", color: [255, 165, 0] as [number, number, number] },
    { symbol: "E", label: "Excused", color: [70, 130, 180] as [number, number, number] },
  ];
  
  let legendX = 30;
  legendItems.forEach(item => {
    doc.setTextColor(...item.color);
    doc.text(`${item.symbol} = ${item.label}`, legendX, finalY);
    legendX += 35;
  });

  // Summary
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Students: ${data.students.length}`, pageWidth - 60, finalY);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
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
  
  drawHeader(
    doc, 
    logoImg, 
    "MONTHLY ATTENDANCE REPORT", 
    `Month: ${format(data.month, "MMMM yyyy")}`,
    schoolName,
    schoolAddress
  );

  // Student photo box
  const photoX = pageWidth - 50;
  const photoY = 55;
  const photoWidth = 30;
  const photoHeight = 38;
  
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
  doc.roundedRect(leftMargin - 3, yPos - 5, pageWidth - photoWidth - 45, 45, 3, 3, "F");
  
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
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "F");
    
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
  
  doc.setDrawColor(...(percentage >= 90 ? [34, 139, 34] : percentage >= 75 ? [255, 165, 0] : [220, 53, 69]) as [number, number, number]);
  doc.setLineWidth(2);
  doc.circle(circleX, yPos + cardHeight / 2, circleRadius);
  
  doc.setTextColor(...(percentage >= 90 ? [34, 139, 34] : percentage >= 75 ? [255, 165, 0] : [220, 53, 69]) as [number, number, number]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${percentage}%`, circleX, yPos + cardHeight / 2 + 2, { align: "center" });
  
  doc.setFontSize(7);
  doc.text("Attendance", circleX, yPos + cardHeight / 2 + 10, { align: "center" });

  // Daily attendance calendar view
  yPos += cardHeight + 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("DAILY ATTENDANCE RECORD", leftMargin, yPos);

  // Create calendar-style table
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOfMonth = monthStart.getDay();
  
  // Build calendar rows
  const calendarRows: string[][] = [];
  let currentRow: string[] = [];
  
  // Add empty cells for days before the first of month
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
  
  // Add remaining days
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
      minCellHeight: 15,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
    },
    margin: { left: leftMargin, right: leftMargin },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const cellText = hookData.cell.text.join("\n");
        if (cellText.includes("P")) hookData.cell.styles.textColor = [34, 139, 34];
        else if (cellText.includes("A")) hookData.cell.styles.textColor = [220, 53, 69];
        else if (cellText.includes("L")) hookData.cell.styles.textColor = [255, 165, 0];
        else if (cellText.includes("E")) hookData.cell.styles.textColor = [70, 130, 180];
      }
    },
  });

  drawFooter(doc, 1, 1);

  return doc;
};

export const downloadClassMonthlyAttendancePdf = async (data: ClassAttendanceData) => {
  const doc = await generateClassMonthlyAttendancePdf(data);
  const className = `${data.className}${data.section ? `-${data.section}` : ""}`;
  doc.save(`Attendance-${className}-${format(data.month, "MMMM-yyyy")}.pdf`);
};

export const downloadIndividualMonthlyAttendancePdf = async (data: IndividualAttendanceData) => {
  const doc = await generateIndividualMonthlyAttendancePdf(data);
  doc.save(`Attendance-${data.studentName.replace(/\s+/g, "-")}-${format(data.month, "MMMM-yyyy")}.pdf`);
};
