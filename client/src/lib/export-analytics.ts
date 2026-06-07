// html2canvas + jspdf are heavy (~500 KB). They're dynamically imported inside
// the export helpers so they only load when the user actually exports, keeping
// the Analytics page bundle small.

// Capture a DOM element to a high-resolution canvas. Elements marked with
// data-export-ignore (e.g. the Export button itself) are omitted, and the
// current page background colour is used so dark-mode exports look right.
async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  const bg =
    getComputedStyle(document.body).backgroundColor ||
    getComputedStyle(document.documentElement).backgroundColor ||
    "#ffffff";
  return html2canvas(el, {
    backgroundColor: bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#ffffff",
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    logging: false,
    ignoreElements: (node) => node instanceof HTMLElement && node.hasAttribute("data-export-ignore"),
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function exportAsPNG(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElement(el);
  triggerDownload(canvas.toDataURL("image/png"), `${filename}.png`);
}

export async function exportAsPDF(el: HTMLElement, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const canvas = await captureElement(el);
  const imgData = canvas.toDataURL("image/png");

  // Portrait A4 in points (pt). Fit the capture to the full page width; for
  // captures taller than one page, re-add the same image shifted upward on each
  // page so it tiles across pages (the canonical html2canvas → jsPDF approach).
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }
  pdf.save(`${filename}.pdf`);
}
