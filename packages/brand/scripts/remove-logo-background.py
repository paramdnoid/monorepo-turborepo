#!/usr/bin/env python3
"""Make packages/brand/assets/logo.png use a transparent background.

1. Flood-remove black + near-white regions reachable from the image edge.
2. Expand transparency through residual dark backdrop pixels (enclosed black bars).
3. Trim to the opaque bounding box (+ 2px padding).

Run from repo root:
  python3 packages/brand/scripts/remove-logo-background.py

Requires: Pillow, numpy.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]  # monorepo root (…/brand/scripts/this file)
ASSET = ROOT / "packages" / "brand" / "assets" / "logo.png"
WEB_COPY = ROOT / "apps" / "web" / "public" / "logo.png"


def flood_from_edges(mask_connect: np.ndarray) -> np.ndarray:
    h, w = mask_connect.shape
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if mask_connect[y, x] and not visited[y, x]:
            visited[y, x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and mask_connect[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return visited


def process_rgba(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)

    remove = np.zeros((h, w), dtype=bool)
    remove |= flood_from_edges(mx <= 18)
    remove |= flood_from_edges(mx >= 248)

    trans = remove.copy()
    q = deque((x, y) for y in range(h) for x in range(w) if trans[y, x])
    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not trans[ny, nx] and mx[ny, nx] <= 26:
                trans[ny, nx] = True
                remove[ny, nx] = True
                q.append((nx, ny))

    out = arr.copy()
    out[remove, 3] = 0
    return out


def trim_opaque(arr: np.ndarray, pad: int = 2) -> np.ndarray:
    a = arr[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return arr
    h, w = arr.shape[:2]
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad + 1)
    return arr[y0:y1, x0:x1]


def main() -> None:
    src = Image.open(ASSET).convert("RGBA")
    arr = process_rgba(np.array(src))
    arr = trim_opaque(arr)
    out = Image.fromarray(arr)
    out.save(ASSET, "PNG", optimize=True)
    out.save(WEB_COPY, "PNG", optimize=True)
    print(f"Wrote {arr.shape[1]}×{arr.shape[0]} RGBA → {ASSET} and {WEB_COPY}")


if __name__ == "__main__":
    main()
