import { Transfer as TransferEvent } from "../generated/Loot/Loot";
import { Bag, Transfer, Wallet, UnclaimedMana } from "../generated/schema";
import { Loot } from "../generated/Loot/Loot";
import { BigInt } from "@graphprotocol/graph-ts";
import { getWallets, isZeroAddress } from "./common";
import {
  getGreatnessByItem,
  getItemClass,
  getItemLevel,
  getItemRank,
  ItemType
} from "./glr_utils";

export function handleTransfer(event: TransferEvent): void {
  let tokenId = event.params.tokenId;
  let wallets = getWallets(event.params.from, event.params.to, event);

  if (!isZeroAddress(wallets.fromWallet.id)) {
    wallets.fromWallet.bagsHeld = wallets.fromWallet.bagsHeld.minus(
      BigInt.fromI32(1)
    );
  }
  wallets.fromWallet.save();

  wallets.toWallet.bagsHeld = wallets.toWallet.bagsHeld.plus(BigInt.fromI32(1));
  wallets.toWallet.save();

  // let fromAddress = event.params.from;
  // let toAddress = event.params.to;
  // let tokenId = event.params.tokenId;
  let suffixArray = [
    "",
    "Power",
    "Giants",
    "Titans",
    "Skill",
    "Perfection",
    "Brilliance",
    "Enlightenment",
    "Protection",
    "Anger",
    "Rage",
    "Fury",
    "Vitriol",
    "the Fox",
    "Detection",
    "Reflection",
    "the Twins"
  ];

  // let fromId = fromAddress.toHex();
  // let fromWallet = Wallet.load(fromId);
  // if (!fromWallet) {
  //   fromWallet = new Wallet(fromId);
  //   fromWallet.address = fromAddress;
  //   fromWallet.joined = event.block.timestamp;
  //   fromWallet.bagsHeld = BigInt.fromI32(0);
  //   fromWallet.save();
  // } else {
  //   if (!isZeroAddress(fromId)) {
  //     fromWallet.bagsHeld = fromWallet.bagsHeld.minus(BigInt.fromI32(1));
  //     fromWallet.save();
  //   }
  // }

  // let toId = toAddress.toHex();
  // let toWallet = Wallet.load(toId);
  // if (!toWallet) {
  //   toWallet = new Wallet(toId);
  //   toWallet.address = toAddress;
  //   toWallet.joined = event.block.timestamp;
  //   toWallet.bagsHeld = BigInt.fromI32(1);
  //   toWallet.bagsHeld = BigInt.fromI32(1);
  //   toWallet.save();
  // } else {
  //   toWallet.bagsHeld = toWallet.bagsHeld.plus(BigInt.fromI32(1));
  //   toWallet.save();
  // }

  let bag = Bag.load(tokenId.toString());
  if (bag != null) {
    bag.currentOwner = wallets.toWallet.id;
    bag.save();

    // Updated unclaimed mana owner
    for (let i = 0; i < 8; i++) {
      let unclaimedMana = UnclaimedMana.load(`${tokenId.toString()}:${i}`);
      if (unclaimedMana) {
        unclaimedMana.currentOwner = wallets.toWallet.id;
        unclaimedMana.save();
      }
    }
  } else {
    bag = new Bag(tokenId.toString());
    let contract = Loot.bind(event.address);
    let item: string;
    bag.manasTotalCount = BigInt.fromI32(0);

    item = contract.getChest(tokenId);
    bag.chest = item;
    if (item.includes("of ")) {
      bag.chestSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.CHEST,
        bag.chestSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.chestSuffixId = 0;

    item = contract.getFoot(tokenId);
    bag.foot = item;
    if (item.includes("of ")) {
      bag.footSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.FOOT,
        bag.footSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.footSuffixId = 0;

    item = contract.getHand(tokenId);
    bag.hand = item;
    if (item.includes("of ")) {
      bag.handSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.HAND,
        bag.handSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.handSuffixId = 0;

    item = contract.getHead(tokenId);
    bag.head = item;
    if (item.includes("of ")) {
      bag.headSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.HEAD,
        bag.headSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.headSuffixId = 0;

    item = contract.getNeck(tokenId);
    bag.neck = item;
    if (item.includes("of ")) {
      bag.neckSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.NECK,
        bag.neckSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.neckSuffixId = 0;

    item = contract.getRing(tokenId);
    bag.ring = item;
    if (item.includes("of ")) {
      bag.ringSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.RING,
        bag.ringSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.ringSuffixId = 0;

    item = contract.getWaist(tokenId);
    bag.waist = item;
    if (item.includes("of ")) {
      bag.waistSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.WAIST,
        bag.waistSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.waistSuffixId = 0;

    item = contract.getWeapon(tokenId);
    bag.weapon = item;
    if (item.includes("of ")) {
      bag.weaponSuffixId = suffixArray.indexOf(
        item.split("of ")[1].split(" +1")[0]
      );
      bag.manasTotalCount = bag.manasTotalCount.plus(BigInt.fromI32(1));
      createUnclaimedMana(
        tokenId.toString(),
        ItemType.WEAPON,
        bag.weaponSuffixId.toString(),
        item,
        wallets.toWallet.id
      );
    } else bag.weaponSuffixId = 0;

    bag.currentOwner = wallets.toWallet.id;
    bag.minted = event.block.timestamp;
    bag.manasClaimed = BigInt.fromI32(0);
    bag.manasUnclaimed = bag.manasTotalCount;
    bag.save();
  }

  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  transfer.bag = tokenId.toString();
  transfer.from = wallets.fromWallet.id;
  transfer.to = wallets.toWallet.id;
  transfer.txHash = event.transaction.hash;
  transfer.timestamp = event.block.timestamp;
  transfer.save();
}

function createUnclaimedMana(
  lootTokenId: string,
  itemType: ItemType,
  orderId: string,
  itemName: string,
  wallet: string
): void {
  let mana = new UnclaimedMana(`${lootTokenId}:${itemType}`);
  mana.lootTokenId = lootTokenId;
  mana.inventoryId = itemType;
  mana.itemName = itemName;

  const lootTokenIdInt = BigInt.fromString(lootTokenId);

  // Deprecated
  mana.itemPower = getItemLevel(lootTokenIdInt, itemType, itemName);
  mana.itemRank = getItemRank(itemType, itemName);

  // GLR
  mana.itemClass = getItemClass(itemType, itemName);
  mana.itemGreatness = getGreatnessByItem(lootTokenIdInt, itemType);
  mana.itemLevel = getItemLevel(lootTokenIdInt, itemType, itemName);
  mana.itemRating =
    getGreatnessByItem(lootTokenIdInt, itemType) *
    getItemLevel(lootTokenIdInt, itemType, itemName);

  mana.orderId = orderId;
  mana.currentOwner = wallet;
  mana.isClaimed = 0;
  mana.tokenURI = "";
  mana.save();
}
