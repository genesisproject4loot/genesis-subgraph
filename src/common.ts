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
      items[i] &&
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
      items[i] &&
      itemName.toLowerCase().indexOf(items[i].toLowerCase()) > -1
    ) {
      itemIndex = i;
      break;
    }
  }
  if (itemIndex < 0) {
    return 0;
  }
  return (itemIndex % 5) + 1;
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

export function isZeroAddress(string: string): boolean {
  return string == "0x0000000000000000000000000000000000000000";
}
