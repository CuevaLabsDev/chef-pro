interface DiffableItem {
  category?: string;
  itemName?: string;
  ingredients?: string;
  dietTags?: string[];
  allergenTags?: string[];
  sortOrder?: number;
}

interface FieldDiff {
  fieldName: string;
  oldValue?: string;
  newValue?: string;
}

export function diffPacketStructure(
  oldPacket: {
    date?: Date | string | null;
    meal?: string | null;
    theme?: string | null;
    items: DiffableItem[];
  },
  newInput: {
    date?: string;
    meal?: string;
    theme?: string;
    items?: DiffableItem[];
  }
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  if (newInput.date !== undefined) {
    const oldDate = oldPacket.date ? new Date(oldPacket.date).toISOString().split("T")[0] : "";
    if (oldDate !== newInput.date) {
      diffs.push({ fieldName: "date", oldValue: oldDate, newValue: newInput.date });
    }
  }

  if (newInput.meal !== undefined && oldPacket.meal !== newInput.meal) {
    diffs.push({ fieldName: "meal", oldValue: oldPacket.meal ?? "", newValue: newInput.meal });
  }

  if (newInput.theme !== undefined && (oldPacket.theme ?? "") !== (newInput.theme ?? "")) {
    diffs.push({
      fieldName: "theme",
      oldValue: oldPacket.theme ?? "",
      newValue: newInput.theme ?? "",
    });
  }

  if (newInput.items) {
    const oldItems = oldPacket.items;
    const newItems = newInput.items;

    const maxLen = Math.max(oldItems.length, newItems.length);
    for (let i = 0; i < maxLen; i++) {
      const old = oldItems[i];
      const nw = newItems[i];
      const prefix = `items[${i}]`;

      if (!old && nw) {
        diffs.push({
          fieldName: `${prefix}`,
          newValue: `Added: ${nw.itemName ?? "unnamed"}`,
        });
        continue;
      }

      if (old && !nw) {
        diffs.push({
          fieldName: `${prefix}`,
          oldValue: `Removed: ${old.itemName ?? "unnamed"}`,
        });
        continue;
      }

      if (old && nw) {
        if (old.itemName !== nw.itemName) {
          diffs.push({
            fieldName: `${prefix}.itemName`,
            oldValue: old.itemName ?? "",
            newValue: nw.itemName ?? "",
          });
        }
        if (old.category !== nw.category) {
          diffs.push({
            fieldName: `${prefix}.category`,
            oldValue: old.category ?? "",
            newValue: nw.category ?? "",
          });
        }
        if (old.ingredients !== nw.ingredients) {
          diffs.push({
            fieldName: `${prefix}.ingredients`,
            oldValue: old.ingredients ?? "",
            newValue: nw.ingredients ?? "",
          });
        }

        const oldDiet = (old.dietTags ?? []).join(", ");
        const newDiet = (nw.dietTags ?? []).join(", ");
        if (oldDiet !== newDiet) {
          diffs.push({
            fieldName: `${prefix}.dietTags`,
            oldValue: oldDiet || "None",
            newValue: newDiet || "None",
          });
        }

        const oldAllergens = (old.allergenTags ?? []).join(", ");
        const newAllergens = (nw.allergenTags ?? []).join(", ");
        if (oldAllergens !== newAllergens) {
          diffs.push({
            fieldName: `${prefix}.allergenTags`,
            oldValue: oldAllergens || "None",
            newValue: newAllergens || "None",
          });
        }
      }
    }
  }

  return diffs;
}
