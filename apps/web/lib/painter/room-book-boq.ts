export type RoomBookLineInput = {
  id: string;
  quantity: string;
  unit: string;
  unitPriceEur: string;
};

export type RoomBookRoomInput = {
  id: string;
  lines: RoomBookLineInput[];
};

export function parseNumberLike(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function computeRoomBookTotals(rooms: RoomBookRoomInput[]) {
  const byRoom = rooms.map((room) => {
    const lineTotals = room.lines.map((line) => {
      const quantity = parseNumberLike(line.quantity) ?? 0;
      const unitPrice = parseNumberLike(line.unitPriceEur) ?? 0;
      const total = quantity * unitPrice;
      return { id: line.id, total, quantity, unit: line.unit.trim() };
    });

    const roomTotal = lineTotals.reduce((sum, row) => sum + row.total, 0);
    const quantitiesByUnit = new Map<string, number>();
    for (const row of lineTotals) {
      if (!row.unit) continue;
      quantitiesByUnit.set(
        row.unit,
        (quantitiesByUnit.get(row.unit) ?? 0) + row.quantity,
      );
    }

    return {
      roomId: room.id,
      roomTotal,
      lineTotals,
      quantitiesByUnit,
    };
  });

  const overallTotal = byRoom.reduce((sum, room) => sum + room.roomTotal, 0);
  const overallQuantitiesByUnit = new Map<string, number>();
  for (const room of byRoom) {
    for (const [unit, quantity] of room.quantitiesByUnit.entries()) {
      overallQuantitiesByUnit.set(
        unit,
        (overallQuantitiesByUnit.get(unit) ?? 0) + quantity,
      );
    }
  }

  return { byRoom, overallTotal, overallQuantitiesByUnit };
}
