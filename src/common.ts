import { BigInt } from "@graphprotocol/graph-ts";

import {
  WEAPONS,
  CHEST_ARMOR,
  HEAD_ARMOR,
  WAIST_ARMOR,
  FOOT_ARMOR,
  HAND_ARMOR,
  CLASSES,
  GREATNESS,
  NECKLACES,
  RINGS
} from "./constants";

export const enum ItemType {
  WEAPON = 0,
  CHEST = 1,
  HEAD = 2,
  WAIST = 3,
  FOOT = 4,
  HAND = 5,
  NECK = 6,
  RING = 7
}

export function getItemClass(itemType: ItemType, itemName: string): string {
  if (itemType === ItemType.NECK) {
    return "";
  } else if (itemType === ItemType.RING) {
    return "";
  }

  let itemIndex = -1;
  let items = getItemNames(itemType);

  for (let i = 0; i < items.length; i++) {
    if (
      items[i] != "" &&
      itemName.toLowerCase().indexOf(items[i].toLowerCase()) > -1
    ) {
      itemIndex = i;
      break;
    }
  }
  if (itemIndex < 0) {
    return "";
  }
  const classIdx = Math.floor(itemIndex / 5) as i32;
  return CLASSES[classIdx] || "";
}

export function getItemRank(itemType: ItemType, itemName: string): i32 {
  if (itemType === ItemType.NECK) {
    return 1;
  } else if (itemType === ItemType.RING) {
    if (itemName.toLowerCase().indexOf("silver") > -1) {
      return 2;
    } else if (itemName.toLowerCase().indexOf("bronze") > -1) {
      return 3;
    } else {
      return 1;
    }
  }

  let items = getItemNames(itemType);
  let itemIndex = -1;
  for (let i = 0; i < items.length; i++) {
    if (
      items[i] != "" &&
      itemName.toLowerCase().indexOf(items[i].toLowerCase()) > -1
    ) {
      itemIndex = i;
      break;
    }
  }
  if (itemIndex < 0) {
    // Default Rank. Currently Catch All for Lost Mana
    return 5;
  }
  return (itemIndex % 5) + 1;
}

export function getItemLevel(itemType: ItemType, itemName: string): i32 {
  const rank = getItemRank(itemType, itemName);
  if (rank === 0) {
    // Default Power/Level 1
    // Currently Catch All for Lost Mana
    return 1;
  }
  if (itemType === ItemType.NECK || itemType === ItemType.RING) {
    return 4 - rank;
  } else {
    return 6 - rank;
  }
}

function getItemNames(itemType: ItemType): string[] {
  if (itemType === ItemType.WEAPON) {
    return WEAPONS;
  } else if (itemType === ItemType.CHEST) {
    return CHEST_ARMOR;
  } else if (itemType === ItemType.HEAD) {
    return HEAD_ARMOR;
  } else if (itemType === ItemType.WAIST) {
    return WAIST_ARMOR;
  } else if (itemType === ItemType.FOOT) {
    return FOOT_ARMOR;
  } else if (itemType === ItemType.HAND) {
    return HAND_ARMOR;
  } else if (itemType === ItemType.NECK) {
    return NECKLACES;
  } else if (itemType === ItemType.RING) {
    return RINGS;
  } else {
    return [];
  }
}

export function getItemGreatness(itemType: ItemType, lootTokenId: BigInt): i32 {
  if (lootTokenId.gt(BigInt.fromI32(0)) && GREATNESS[lootTokenId.toI32()]) {
    return GREATNESS[lootTokenId.toI32()][itemType];
  }
  // Lost Mana
  else {
    return 15;
  }
}

// Expecting [[lootTokenId, iventoryId, itemName]]
export function getBagGreatness(items: string[][]): i32 {
  let greatness = 0;
  for (let i = 0; i < items.length; i++) {
    greatness += getItemGreatness(
      BigInt.fromString(items[i][1]).toI32(),
      BigInt.fromString(items[i][0])
    );
  }
  return greatness;
}

// Expecting [[lootTokenId, iventoryId, itemName]]
export function getBagLevel(items: string[][]): i32 {
  let level = 0;
  for (let i = 0; i < items.length; i++) {
    level += getItemLevel(BigInt.fromString(items[i][1]).toI32(), items[i][2]);
  }
  return level;
}

// Expecting [[lootTokenId, iventoryId, itemName]]
export function getBagRating(items: string[][]): i32 {
  let rating = 0;
  for (let i = 0; i < items.length; i++) {
    rating +=
      getItemLevel(BigInt.fromString(items[i][1]).toI32(), items[i][2]) *
      getItemGreatness(
        BigInt.fromString(items[i][1]).toI32(),
        BigInt.fromString(items[i][0])
      );
  }
  return rating;
}

export function isZeroAddress(string: string): boolean {
  return string == "0x0000000000000000000000000000000000000000";
}

export function arrayToI32(values: BigInt[]): i32[] {
  const vals = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < values.length; i++) {
    vals[i] = values[i].toI32();
  }
  return vals;
}
