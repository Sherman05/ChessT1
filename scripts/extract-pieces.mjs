/**
 * Extract individual chess piece SVGs from composite Inkscape SVG file.
 *
 * Input:  public/assets/ФигурыWhiteBlack chess-T1 для ГИ 2026.svg
 * Output: public/pieces/{color}-{kind}.svg (14 files)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import svgPathParser from 'svg-path-parser';
const { parseSVG, makeAbsolute } = svgPathParser;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Group ID → piece mapping
const PIECE_MAP = {
  g8188: { color: 'white', kind: 'pawn' },
  g8158: { color: 'white', kind: 'veteran' },
  g969:  { color: 'white', kind: 'rook' },
  g997:  { color: 'white', kind: 'king' },
  g8168: { color: 'white', kind: 'knight' },
  g8189: { color: 'white', kind: 'queen' },
  g8429: { color: 'white', kind: 'bishop' },
  g962:  { color: 'black', kind: 'pawn' },
  g8125: { color: 'black', kind: 'veteran' },
  g8202: { color: 'black', kind: 'rook' },
  g1011: { color: 'black', kind: 'king' },
  g8215: { color: 'black', kind: 'knight' },
  g8199: { color: 'black', kind: 'queen' },
  g8462: { color: 'black', kind: 'bishop' },
};

/**
 * Parse SVG transform="matrix(a,b,c,d,e,f)" or "translate(tx,ty)"
 * Returns [a, b, c, d, e, f] (identity if no transform)
 */
function parseTransform(transformStr) {
  if (!transformStr) return [1, 0, 0, 1, 0, 0];

  const matrixMatch = transformStr.match(
    /matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/
  );
  if (matrixMatch) {
    return matrixMatch.slice(1, 7).map(Number);
  }

  const translateMatch = transformStr.match(
    /translate\(\s*([^,]+),\s*([^)]+)\)/
  );
  if (translateMatch) {
    return [1, 0, 0, 1, Number(translateMatch[1]), Number(translateMatch[2])];
  }

  const scaleMatch = transformStr.match(/scale\(\s*([^,)]+)(?:,\s*([^)]+))?\)/);
  if (scaleMatch) {
    const sx = Number(scaleMatch[1]);
    const sy = scaleMatch[2] ? Number(scaleMatch[2]) : sx;
    return [sx, 0, 0, sy, 0, 0];
  }

  return [1, 0, 0, 1, 0, 0];
}

/**
 * Compose two affine transforms: result = parent * child
 * Each transform is [a, b, c, d, e, f]
 */
function composeTransform(p, c) {
  return [
    p[0] * c[0] + p[2] * c[1],
    p[1] * c[0] + p[3] * c[1],
    p[0] * c[2] + p[2] * c[3],
    p[1] * c[2] + p[3] * c[3],
    p[0] * c[4] + p[2] * c[5] + p[4],
    p[1] * c[4] + p[3] * c[5] + p[5],
  ];
}

/**
 * Apply affine transform to a point
 */
function applyTransform(t, x, y) {
  return [
    t[0] * x + t[2] * y + t[4],
    t[1] * x + t[3] * y + t[5],
  ];
}

/**
 * Extract all coordinate points from path data string.
 * Returns array of [x, y] in absolute coordinates.
 */
function getPathPoints(d) {
  try {
    const commands = makeAbsolute(parseSVG(d));
    const points = [];
    for (const cmd of commands) {
      if ('x' in cmd && 'y' in cmd) {
        points.push([cmd.x, cmd.y]);
      }
      if ('x1' in cmd && 'y1' in cmd) {
        points.push([cmd.x1, cmd.y1]);
      }
      if ('x2' in cmd && 'y2' in cmd) {
        points.push([cmd.x2, cmd.y2]);
      }
    }
    return points;
  } catch (e) {
    console.warn(`  Warning: could not parse path: ${d.substring(0, 50)}...`);
    return [];
  }
}

/**
 * Get points from a circle element
 */
function getCirclePoints(el) {
  const cx = parseFloat(el.attribs.cx || '0');
  const cy = parseFloat(el.attribs.cy || '0');
  const r = parseFloat(el.attribs.r || '0');
  return [
    [cx - r, cy - r],
    [cx + r, cy + r],
  ];
}

/**
 * Get points from a rect element
 */
function getRectPoints(el) {
  const x = parseFloat(el.attribs.x || '0');
  const y = parseFloat(el.attribs.y || '0');
  const w = parseFloat(el.attribs.width || '0');
  const h = parseFloat(el.attribs.height || '0');
  return [
    [x, y],
    [x + w, y + h],
  ];
}

/**
 * Get points from an ellipse element
 */
function getEllipsePoints(el) {
  const cx = parseFloat(el.attribs.cx || '0');
  const cy = parseFloat(el.attribs.cy || '0');
  const rx = parseFloat(el.attribs.rx || '0');
  const ry = parseFloat(el.attribs.ry || '0');
  return [
    [cx - rx, cy - ry],
    [cx + rx, cy + ry],
  ];
}

/**
 * Recursively collect all transformed points from a group element
 */
function collectPoints($, el, parentTransform) {
  const points = [];
  const elTransform = parseTransform($(el).attr('transform'));
  const combined = composeTransform(parentTransform, elTransform);

  $(el).children().each((_, child) => {
    const tag = child.tagName || child.name;
    if (tag === 'g') {
      points.push(...collectPoints($, child, combined));
    } else if (tag === 'path') {
      const d = $(child).attr('d');
      if (d) {
        const childTransform = parseTransform($(child).attr('transform'));
        const childCombined = composeTransform(combined, childTransform);
        const pathPoints = getPathPoints(d);
        for (const [px, py] of pathPoints) {
          points.push(applyTransform(childCombined, px, py));
        }
      }
    } else if (tag === 'circle') {
      const childTransform = parseTransform($(child).attr('transform'));
      const childCombined = composeTransform(combined, childTransform);
      // Handle scale(-1) transform for circles
      const circlePoints = getCirclePoints(child);
      for (const [px, py] of circlePoints) {
        points.push(applyTransform(childCombined, px, py));
      }
    } else if (tag === 'rect') {
      const childTransform = parseTransform($(child).attr('transform'));
      const childCombined = composeTransform(combined, childTransform);
      const rectPoints = getRectPoints(child);
      for (const [px, py] of rectPoints) {
        points.push(applyTransform(childCombined, px, py));
      }
    } else if (tag === 'ellipse') {
      const childTransform = parseTransform($(child).attr('transform'));
      const childCombined = composeTransform(combined, childTransform);
      const ellipsePoints = getEllipsePoints(child);
      for (const [px, py] of ellipsePoints) {
        points.push(applyTransform(childCombined, px, py));
      }
    }
  });

  return points;
}

/**
 * Strip Inkscape/Sodipodi attributes from element and all children
 */
function cleanElement($, el) {
  const STRIP_ATTRS = [
    'inkscape:connector-curvature',
    'inkscape:export-filename',
    'inkscape:export-xdpi',
    'inkscape:export-ydpi',
    'inkscape:transform-center-x',
    'inkscape:transform-center-y',
    'inkscape:randomized',
    'inkscape:rounded',
    'inkscape:flatsided',
    'sodipodi:arg1',
    'sodipodi:arg2',
    'sodipodi:r1',
    'sodipodi:r2',
    'sodipodi:cx',
    'sodipodi:cy',
    'sodipodi:sides',
    'sodipodi:type',
    'sodipodi:role',
  ];

  const $el = $(el);
  for (const attr of STRIP_ATTRS) {
    $el.removeAttr(attr);
  }
  // Remove id attributes (unnecessary in standalone files)
  $el.removeAttr('id');

  $el.children().each((_, child) => {
    cleanElement($, child);
  });
}

/**
 * Get inner HTML of an element (its children markup)
 */
function getGroupInnerContent($, groupEl) {
  // Clone the group, clean it, and get its outerHTML
  const $group = $(groupEl).clone();
  cleanElement($, $group[0]);
  // Remove the group's own export/inkscape attributes but keep transform
  $group.removeAttr('inkscape:export-filename');
  $group.removeAttr('inkscape:export-xdpi');
  $group.removeAttr('inkscape:export-ydpi');
  // Get the group's inner HTML
  return $group.html();
}

// ============ Main ============

const svgPath = resolve(ROOT, 'public/assets/ФигурыWhiteBlack chess-T1 для ГИ 2026.svg');
const svgContent = readFileSync(svgPath, 'utf-8');
const $ = cheerio.load(svgContent, { xmlMode: true });

console.log('Extracting chess pieces from composite SVG...\n');

let extracted = 0;
let failed = 0;

for (const [groupId, { color, kind }] of Object.entries(PIECE_MAP)) {
  const filename = `${color}-${kind}.svg`;
  console.log(`Processing ${groupId} → ${filename}`);

  const groupEl = $(`#${groupId}`);
  if (groupEl.length === 0) {
    console.error(`  ERROR: Group #${groupId} not found!`);
    failed++;
    continue;
  }

  // Collect all points with transforms applied to compute bounding box
  const identity = [1, 0, 0, 1, 0, 0];
  const groupTransform = parseTransform(groupEl.attr('transform'));
  const points = collectPoints($, groupEl[0], identity);

  // Apply the group's own transform to get final coordinates
  const transformedPoints = points.map(([x, y]) => applyTransform(groupTransform, x, y));

  if (transformedPoints.length === 0) {
    console.error(`  ERROR: No points found for group #${groupId}!`);
    failed++;
    continue;
  }

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of transformedPoints) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  // Add padding for stroke width (max stroke ~6 units, scaled by ~0.9 → ~5.5)
  const padding = 6;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  console.log(`  BBox: ${minX.toFixed(1)}, ${minY.toFixed(1)} → ${maxX.toFixed(1)}, ${maxY.toFixed(1)} (${width.toFixed(1)} × ${height.toFixed(1)})`);

  // Get the group's transform attribute
  const transform = groupEl.attr('transform') || '';

  // Clean and extract inner content
  const innerContent = getGroupInnerContent($, groupEl[0]);

  // Build standalone SVG
  const viewBox = `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<g transform="${transform}">
${innerContent}
</g>
</svg>
`;

  const outPath = resolve(ROOT, 'public/pieces', filename);
  writeFileSync(outPath, svg, 'utf-8');
  console.log(`  ✓ Written to ${filename}`);
  extracted++;
}

console.log(`\n=== Done: ${extracted} extracted, ${failed} failed ===`);
if (failed > 0) process.exit(1);
