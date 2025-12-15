import { jsPDF } from "jspdf";
import { Ancestor } from "../types";
import { calculateStats } from "../utils/genealogy";

interface ReportImages {
  tree?: string;
  three?: string;
}

export const generateFamilyReport = (ancestors: Ancestor[], images?: ReportImages) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let cursorY = margin;
  let pageNumber = 1;

  // --- Helpers ---
  const addPageNumber = () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      doc.setTextColor(0);
      pageNumber++;
  };

  const addNewPage = () => {
      addPageNumber();
      doc.addPage();
      cursorY = margin;
  };

  const addTitle = (text: string, y: number) => {
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  };

  const addSectionTitle = (text: string) => {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(text, margin, cursorY);
    doc.line(margin, cursorY + 2, pageWidth - margin, cursorY + 2);
    cursorY += 15;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (cursorY + heightNeeded > pageHeight - margin) {
      addNewPage();
    }
  };

  const addText = (text: string, fontSize = 11, isBold = false, color = [0,0,0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    
    const textLines = doc.splitTextToSize(text, pageWidth - margin * 2);
    const textHeight = textLines.length * (fontSize * 0.5);

    checkPageBreak(textHeight);
    doc.text(textLines, margin, cursorY);
    cursorY += textHeight + 2;
    doc.setTextColor(0);
  };

  const sortedAncestors = [...ancestors].sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
  const stats = calculateStats(ancestors);

  // ==========================
  // 1. COVER PAGE
  // ==========================
  doc.setFillColor(15, 23, 42); // Slate-900 background
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Decorative Circle
  doc.setDrawColor(59, 130, 246); // Blue
  doc.setLineWidth(2);
  doc.circle(pageWidth/2, pageHeight/2 - 20, 40, "S");

  addTitle("The Family Book", pageHeight / 2 - 15);
  
  doc.setFontSize(14);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`A comprehensive history of ${stats.total} ancestors`, pageWidth / 2, pageHeight / 2 + 35, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, { align: "center" });

  // Reset for next pages
  doc.addPage();
  cursorY = margin;
  doc.setTextColor(0);

  // ==========================
  // 2. TABLE OF CONTENTS
  // ==========================
  addSectionTitle("Table of Contents");
  
  const toc = [
      "Family Overview & Statistics",
      "Family Tree Visualization",
      "3D World Map",
      "Ancestral Records (Chronological)"
  ];
  
  toc.forEach((item, i) => {
      addText(`${i + 1}. ${item}`, 12);
      cursorY += 2;
  });
  
  addNewPage();

  // ==========================
  // 3. OVERVIEW
  // ==========================
  addSectionTitle("Family Overview");
  
  addText(`Total Family Members: ${stats.total}`);
  addText(`Average Lifespan: ${stats.avgLifespan} years`);
  addText(`Gender Distribution: ${stats.male} Males, ${stats.female} Females, ${stats.unknown} Unknown`);
  
  cursorY += 10;
  addText("This report serves as a permanent record of the family lineage. The data contained herein has been compiled from various records and enhanced with historical context.", 11, false, [100, 100, 100]);
  
  addNewPage();

  // ==========================
  // 4. VISUALIZATIONS
  // ==========================
  
  // TREE VIEW
  if (images?.tree) {
    addSectionTitle("Family Tree Visualization");
    try {
        const props = doc.getImageProperties(images.tree);
        const pdfWidth = pageWidth - (margin * 2);
        const pdfHeight = (props.height * pdfWidth) / props.width;
        
        const availableHeight = pageHeight - cursorY - margin;
        // If image is too tall, scale it down or add page
        if (pdfHeight > availableHeight) {
             // If massive, new page
             addNewPage();
             addSectionTitle("Family Tree Visualization (Cont.)");
        }
        
        doc.addImage(images.tree, 'PNG', margin, cursorY, pdfWidth, Math.min(pdfHeight, pageHeight - cursorY - margin));
    } catch (e) {
        addText("(Tree Image Not Available)");
    }
    addNewPage();
  }

  // 3D VIEW
  if (images?.three) {
    addSectionTitle("Global Family Footprint");
    try {
        const props = doc.getImageProperties(images.three);
        const pdfWidth = pageWidth - (margin * 2);
        const pdfHeight = (props.height * pdfWidth) / props.width;
        
        doc.addImage(images.three, 'PNG', margin, cursorY, pdfWidth, Math.min(pdfHeight, pageHeight - cursorY - margin));
    } catch (e) {
        addText("(3D Image Not Available)");
    }
    addNewPage();
  }

  // ==========================
  // 5. RECORDS
  // ==========================
  addSectionTitle("Ancestral Records");

  sortedAncestors.forEach((person, index) => {
    checkPageBreak(50); 

    // Header Bar
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, cursorY - 5, pageWidth - (margin * 2), 12, "F");
    
    // Name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(person.name, margin + 2, cursorY + 3);
    
    // Dates
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const dateStr = `${person.birthYear || '?'} - ${person.deathYear || 'Present'}`;
    doc.text(dateStr, pageWidth - margin - 5, cursorY + 3, { align: "right" });
    
    cursorY += 12;

    // Info Grid
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    const father = ancestors.find(a => a.id === person.fatherId)?.name || 'Unknown';
    const mother = ancestors.find(a => a.id === person.motherId)?.name || 'Unknown';

    addText(`Gender: ${person.gender}`, 10);
    addText(`Location: ${person.country || 'Unknown'}`, 10);
    addText(`Parents: ${father} & ${mother}`, 10);
    
    if (person.notes) {
      cursorY += 2;
      addText("Notes:", 9, true, [100, 100, 100]);
      addText(person.notes, 9);
    }

    cursorY += 8; // Spacer
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;
  });

  addPageNumber();
  doc.save("AncestryAI_Family_Book.pdf");
};