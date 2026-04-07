function normalizeAddressComparable(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,/\\-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

function normalizeStreetHouseNumberOrder(rawStreet: string): string {
  const street = rawStreet.trim();
  if (!street) {
    return "";
  }
  const leadingHouseNumber = /^(\d+[a-zA-Z0-9/-]*)\s+(.+)$/.exec(street);
  if (!leadingHouseNumber) {
    return street;
  }
  const houseNumber = (leadingHouseNumber[1] ?? "").trim();
  const streetName = (leadingHouseNumber[2] ?? "").trim();
  if (!houseNumber || !streetName) {
    return street;
  }
  return `${streetName} ${houseNumber}`;
}

function normalizeRecipient(recipientName: string, street: string): string {
  const recipient = recipientName.trim();
  if (!recipient) {
    return "";
  }
  const streetKey = normalizeAddressComparable(street);
  const recipientKey = normalizeAddressComparable(recipient);
  if (streetKey && recipientKey && streetKey === recipientKey) {
    return "";
  }
  return recipient;
}

export function normalizeAddressFields(
  recipientName: string,
  street: string,
): {
  recipientName: string;
  street: string;
} {
  const normalizedStreet = normalizeStreetHouseNumberOrder(street);
  return {
    recipientName: normalizeRecipient(recipientName, normalizedStreet),
    street: normalizedStreet,
  };
}
