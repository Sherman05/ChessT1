/**
 * Save the board as a PNG image using html2canvas-like approach
 * via native Canvas API and DOM screenshot.
 */
export async function saveBoardAsImage(boardEl: HTMLElement, moveNumber: number): Promise<void> {
  const rect = boardEl.getBoundingClientRect();
  const scale = 2; // retina-quality
  const w = rect.width * scale;
  const h = rect.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw each square
  const squares = boardEl.querySelectorAll<HTMLElement>('.square');
  for (const sq of squares) {
    const sqRect = sq.getBoundingClientRect();
    const x = (sqRect.left - rect.left) * scale;
    const y = (sqRect.top - rect.top) * scale;
    const sw = sqRect.width * scale;
    const sh = sqRect.height * scale;

    // Background color
    const computed = getComputedStyle(sq);
    ctx.fillStyle = computed.backgroundColor || '#fff';
    ctx.fillRect(x, y, sw, sh);

    // Draw piece image if present
    const img = sq.querySelector('img') as HTMLImageElement | null;
    if (img && img.src) {
      try {
        const pieceImg = await loadImage(img.src);
        // Center the piece in the square
        const imgRect = img.getBoundingClientRect();
        const ix = (imgRect.left - rect.left) * scale;
        const iy = (imgRect.top - rect.top) * scale;
        const iw = imgRect.width * scale;
        const ih = imgRect.height * scale;
        ctx.drawImage(pieceImg, ix, iy, iw, ih);
      } catch {
        // skip if image fails to load
      }
    }
  }

  // Draw grid lines
  ctx.strokeStyle = '#000';
  ctx.lineWidth = scale;
  ctx.strokeRect(0, 0, w, h);

  // Add move number watermark at bottom-right
  if (moveNumber > 0) {
    const fontSize = 14 * scale;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Ход ${moveNumber}`, w - 8 * scale, h - 4 * scale);
  }

  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-t1-ход-${moveNumber || 'начало'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
