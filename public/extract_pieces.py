#!/usr/bin/env python3
"""
Extract individual chess piece SVGs from the master SVG file.

Chess-T1 piece types (7 types x 2 colors = 14 pieces):
- king (Король) - octagonal head, 3 vertical lines, gray belt
- rook (Коннет) - tower-like dome top, 2 vertical lines
- prince (Принц) - triangle top, octagonal head, 2 vertical lines, gray belt
- knight (Риттер) - tower top + triangle + ellipse + visor + gray parts
- pawn (Кнехт) - simple: triangle top + trapezoid body + 1 vertical line
- veteran (Вер Кнехт) - like pawn but with 2 vertical lines
- bishop (Разведчик) - triangle top + wide trapezoid body, no vertical lines
"""

import xml.etree.ElementTree as ET
import re
import os
import sys


# Master SVG file
MASTER_SVG = "/home/user/ChessT1/public/ФигурыWhiteBlack chess-T1 для ГИ 2026.svg"
OUTPUT_DIR = "/home/user/ChessT1/public/pieces"

# Namespace map
NS = {
    'svg': 'http://www.w3.org/2000/svg',
    'inkscape': 'http://www.inkscape.org/namespaces/inkscape',
    'sodipodi': 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
}

# Group ID to piece name mapping (determined by analyzing SVG structure)
GROUP_MAP = {
    'g8188': 'white-pawn',
    'g8158': 'white-veteran',
    'g8202': 'black-rook',
    'g8125': 'black-veteran',
    'g8168': 'white-knight',
    'g8189': 'white-prince',
    'g8215': 'black-knight',
    'g1011': 'black-king',
    'g8199': 'black-prince',
    'g969':  'white-rook',
    'g997':  'white-king',
    'g962':  'black-pawn',
    'g8429': 'white-bishop',
    'g8462': 'black-bishop',
}


def parse_transform(transform_str):
    """Parse SVG transform attribute and return a transformation matrix [a,b,c,d,e,f]."""
    if not transform_str:
        return [1, 0, 0, 1, 0, 0]  # identity

    result = [1, 0, 0, 1, 0, 0]

    # Handle matrix()
    m = re.search(r'matrix\(([^)]+)\)', transform_str)
    if m:
        vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
        if len(vals) == 6:
            return vals

    # Handle translate()
    m = re.search(r'translate\(([^)]+)\)', transform_str)
    if m:
        vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
        tx, ty = vals[0], vals[1] if len(vals) > 1 else 0
        result = multiply_matrices(result, [1, 0, 0, 1, tx, ty])

    # Handle scale()
    m = re.search(r'scale\(([^)]+)\)', transform_str)
    if m:
        vals = [float(x) for x in m.group(1).replace(',', ' ').split()]
        sx = vals[0]
        sy = vals[1] if len(vals) > 1 else sx
        result = multiply_matrices(result, [sx, 0, 0, sy, 0, 0])

    return result


def multiply_matrices(m1, m2):
    """Multiply two 2D transform matrices [a,b,c,d,e,f]."""
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return [
        a1*a2 + c1*b2,
        b1*a2 + d1*b2,
        a1*c2 + c1*d2,
        b1*c2 + d1*d2,
        a1*e2 + c1*f2 + e1,
        b1*e2 + d1*f2 + f1,
    ]


def transform_point(matrix, x, y):
    """Apply transform matrix to a point."""
    a, b, c, d, e, f = matrix
    return (a*x + c*y + e, b*x + d*y + f)


def parse_path_d(d):
    """Extract coordinate points from an SVG path 'd' attribute for bounding box estimation."""
    points = []
    if not d:
        return points

    tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)

    cx, cy = 0, 0
    i = 0
    cmd = 'M'
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd in ('Z', 'z'):
                continue

        if cmd in ('M', 'L', 'T'):
            x = float(tokens[i]); i += 1
            y = float(tokens[i]); i += 1
            cx, cy = x, y
            points.append((cx, cy))
            if cmd == 'M':
                cmd = 'L'  # subsequent coords after M are treated as L
        elif cmd in ('m', 'l', 't'):
            x = float(tokens[i]); i += 1
            y = float(tokens[i]); i += 1
            cx += x; cy += y
            points.append((cx, cy))
            if cmd == 'm':
                cmd = 'l'
        elif cmd == 'H':
            cx = float(tokens[i]); i += 1
            points.append((cx, cy))
        elif cmd == 'h':
            cx += float(tokens[i]); i += 1
            points.append((cx, cy))
        elif cmd == 'V':
            cy = float(tokens[i]); i += 1
            points.append((cx, cy))
        elif cmd == 'v':
            cy += float(tokens[i]); i += 1
            points.append((cx, cy))
        elif cmd == 'C':
            for _ in range(3):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((x, y))
            cx, cy = x, y
        elif cmd == 'c':
            for j in range(3):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((cx + x, cy + y))
                if j == 2:
                    cx += x; cy += y
        elif cmd == 'S':
            for _ in range(2):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((x, y))
            cx, cy = x, y
        elif cmd == 's':
            for j in range(2):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((cx + x, cy + y))
                if j == 1:
                    cx += x; cy += y
        elif cmd == 'Q':
            for _ in range(2):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((x, y))
            cx, cy = x, y
        elif cmd == 'q':
            for j in range(2):
                x = float(tokens[i]); i += 1
                y = float(tokens[i]); i += 1
                points.append((cx + x, cy + y))
                if j == 1:
                    cx += x; cy += y
        elif cmd == 'A':
            i += 5  # skip rx, ry, x-rot, large-arc, sweep
            x = float(tokens[i]); i += 1
            y = float(tokens[i]); i += 1
            # Also account for arc radius for bbox
            # We already skipped to end point; approximate with rx/ry expansion
            cx, cy = x, y
            points.append((cx, cy))
        elif cmd == 'a':
            rx = float(tokens[i]); i += 1
            ry = float(tokens[i]); i += 1
            i += 3  # skip x-rot, large-arc, sweep
            dx = float(tokens[i]); i += 1
            dy = float(tokens[i]); i += 1
            # Add some arc extent approximation
            points.append((cx - rx, cy - ry))
            points.append((cx + rx, cy + ry))
            cx += dx; cy += dy
            points.append((cx, cy))
        else:
            # Unknown command, skip a token
            i += 1

    return points


def get_element_points(elem, parent_matrix=None):
    """Compute approximate bounding box points of an SVG element and its children."""
    if parent_matrix is None:
        parent_matrix = [1, 0, 0, 1, 0, 0]

    transform = elem.get('transform', '')
    local_matrix = parse_transform(transform)
    matrix = multiply_matrices(parent_matrix, local_matrix)

    all_points = []

    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag

    if tag == 'path':
        d = elem.get('d', '')
        pts = parse_path_d(d)
        for px, py in pts:
            tx, ty = transform_point(matrix, px, py)
            all_points.append((tx, ty))

    elif tag == 'rect':
        x = float(elem.get('x', 0))
        y = float(elem.get('y', 0))
        w = float(elem.get('width', 0))
        h = float(elem.get('height', 0))
        for px, py in [(x, y), (x+w, y), (x+w, y+h), (x, y+h)]:
            tx, ty = transform_point(matrix, px, py)
            all_points.append((tx, ty))

    elif tag == 'circle':
        ccx = float(elem.get('cx', 0))
        ccy = float(elem.get('cy', 0))
        r = float(elem.get('r', 0))
        for px, py in [(ccx-r, ccy-r), (ccx+r, ccy-r), (ccx+r, ccy+r), (ccx-r, ccy+r)]:
            tx, ty = transform_point(matrix, px, py)
            all_points.append((tx, ty))

    elif tag == 'ellipse':
        ccx = float(elem.get('cx', 0))
        ccy = float(elem.get('cy', 0))
        rx = float(elem.get('rx', 0))
        ry = float(elem.get('ry', 0))
        for px, py in [(ccx-rx, ccy-ry), (ccx+rx, ccy-ry), (ccx+rx, ccy+ry), (ccx-rx, ccy+ry)]:
            tx, ty = transform_point(matrix, px, py)
            all_points.append((tx, ty))

    # Recurse into children
    for child in elem:
        child_points = get_element_points(child, matrix)
        all_points.extend(child_points)

    return all_points


def compute_bbox(points):
    """Compute min/max bounding box from a list of (x,y) points."""
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs), max(ys))


def extract_pieces():
    """Main extraction function."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Register namespaces to preserve them in output
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.register_namespace('inkscape', 'http://www.inkscape.org/namespaces/inkscape')
    ET.register_namespace('sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd')
    ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')

    tree = ET.parse(MASTER_SVG)
    root = tree.getroot()

    # Find Layer 2 which contains the pieces
    layer2 = None
    for g in root.iter('{http://www.w3.org/2000/svg}g'):
        if g.get('id') == 'layer2':
            layer2 = g
            break

    if layer2 is None:
        print("ERROR: Could not find layer2!")
        sys.exit(1)

    print(f"Found layer2 with {len(list(layer2))} children")

    # Get defs from master for potential gradient references
    defs = root.find('{http://www.w3.org/2000/svg}defs')
    defs_str = ''
    if defs is not None:
        # Only include relevant defs (gradients etc), skip inkscape metadata
        defs_str = ET.tostring(defs, encoding='unicode')

    extracted = 0
    for group in layer2:
        tag = group.tag.split('}')[-1] if '}' in group.tag else group.tag
        if tag != 'g':
            continue

        group_id = group.get('id', '')
        if group_id not in GROUP_MAP:
            print(f"  Skipping unknown group: {group_id}")
            continue

        piece_name = GROUP_MAP[group_id]

        # Compute bounding box by walking all geometry
        points = get_element_points(group)
        if not points:
            print(f"  WARNING: No points found for {piece_name} (group {group_id})")
            continue

        bbox = compute_bbox(points)
        if bbox is None:
            print(f"  WARNING: Could not compute bbox for {piece_name}")
            continue

        min_x, min_y, max_x, max_y = bbox
        width = max_x - min_x
        height = max_y - min_y

        # Add padding (8% on each side for stroke width coverage)
        pad_x = width * 0.08
        pad_y = height * 0.08
        vb_x = min_x - pad_x
        vb_y = min_y - pad_y
        vb_w = width + 2 * pad_x
        vb_h = height + 2 * pad_y

        # Normalize display size to 100px wide
        display_w = 100
        display_h = round(display_w * vb_h / vb_w) if vb_w > 0 else 100

        # Serialize the group element
        group_str = ET.tostring(group, encoding='unicode')

        # Build standalone SVG
        svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     viewBox="{vb_x:.2f} {vb_y:.2f} {vb_w:.2f} {vb_h:.2f}"
     width="{display_w}" height="{display_h}">
{group_str}
</svg>
'''

        output_path = os.path.join(OUTPUT_DIR, f"{piece_name}.svg")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)

        print(f"  OK: {piece_name}.svg  size={os.path.getsize(output_path)} bytes  "
              f"viewBox=({vb_x:.1f}, {vb_y:.1f}, {vb_w:.1f}, {vb_h:.1f})  "
              f"display={display_w}x{display_h}")
        extracted += 1

    print(f"\nTotal: {extracted}/14 pieces extracted to {OUTPUT_DIR}/")
    if extracted == 14:
        print("All pieces extracted successfully!")
    else:
        print(f"WARNING: Expected 14 pieces, got {extracted}")


if __name__ == '__main__':
    extract_pieces()
