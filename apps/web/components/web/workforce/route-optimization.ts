export type CostMatrix = number[][];

export function buildCostMatrixFromDurations(
  durations: Array<Array<number | null>> | null,
): CostMatrix | null {
  if (!durations) return null;
  if (!Array.isArray(durations) || durations.length < 2) return null;
  const n = durations.length;
  const out: CostMatrix = Array.from({ length: n }, () => Array(n).fill(Number.POSITIVE_INFINITY));
  for (let i = 0; i < n; i += 1) {
    const row = durations[i];
    if (!Array.isArray(row) || row.length !== n) {
      return null;
    }
    for (let j = 0; j < n; j += 1) {
      const v = row[j];
      out[i]![j] = typeof v === "number" && Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
    }
    out[i]![i] = 0;
  }
  return out;
}

export function buildSymmetricCostMatrix(cost: CostMatrix): CostMatrix {
  const n = cost.length;
  const out: CostMatrix = Array.from({ length: n }, () => Array(n).fill(Number.POSITIVE_INFINITY));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) {
        out[i]![j] = 0;
        continue;
      }
      const a = cost[i]?.[j] ?? Number.POSITIVE_INFINITY;
      const b = cost[j]?.[i] ?? Number.POSITIVE_INFINITY;
      const finiteA = Number.isFinite(a);
      const finiteB = Number.isFinite(b);
      if (finiteA && finiteB) {
        out[i]![j] = (a + b) / 2;
      } else if (finiteA) {
        out[i]![j] = a;
      } else if (finiteB) {
        out[i]![j] = b;
      } else {
        out[i]![j] = Number.POSITIVE_INFINITY;
      }
    }
  }
  return out;
}

export function pathCostSeconds(path: number[], cost: CostMatrix): number | null {
  if (path.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const v = cost[a]?.[b] ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(v)) {
      return null;
    }
    sum += v;
  }
  return sum;
}

export function nearestNeighborPath(cost: CostMatrix, startIndex = 0): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const start = startIndex >= 0 && startIndex < n ? startIndex : 0;
  const unvisited = new Set<number>();
  for (let i = 0; i < n; i += 1) unvisited.add(i);
  unvisited.delete(start);

  const path = [start];
  let current = start;
  while (unvisited.size > 0) {
    let best: number | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const cand of unvisited) {
      const v = cost[current]?.[cand] ?? Number.POSITIVE_INFINITY;
      if (v < bestCost) {
        bestCost = v;
        best = cand;
      }
    }
    if (best === null || !Number.isFinite(bestCost)) {
      break;
    }
    unvisited.delete(best);
    path.push(best);
    current = best;
  }
  if (path.length !== n) {
    return Array.from({ length: n }, (_, i) => i);
  }
  return path;
}

function reverseSegment(path: number[], fromIdx: number, toIdx: number): number[] {
  const out = path.slice(0);
  let i = fromIdx;
  let j = toIdx;
  while (i < j) {
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
    i += 1;
    j -= 1;
  }
  return out;
}

export function twoOptPath(
  initialPath: number[],
  symmetricCost: CostMatrix,
  maxIterations = 1500,
): number[] {
  const n = initialPath.length;
  if (n < 4) return initialPath;

  let best = initialPath.slice(0);
  let improved = true;
  let iter = 0;

  while (improved && iter < maxIterations) {
    improved = false;
    iter += 1;
    for (let i = 0; i < n - 2; i += 1) {
      const a = best[i]!;
      const b = best[i + 1]!;
      for (let k = i + 1; k < n - 1; k += 1) {
        const c = best[k]!;
        const d = best[k + 1]!;
        const before =
          (symmetricCost[a]?.[b] ?? Number.POSITIVE_INFINITY) +
          (symmetricCost[c]?.[d] ?? Number.POSITIVE_INFINITY);
        const after =
          (symmetricCost[a]?.[c] ?? Number.POSITIVE_INFINITY) +
          (symmetricCost[b]?.[d] ?? Number.POSITIVE_INFINITY);
        if (!Number.isFinite(before) || !Number.isFinite(after)) {
          continue;
        }
        if (after + 1e-6 < before) {
          best = reverseSegment(best, i + 1, k);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return best;
}

