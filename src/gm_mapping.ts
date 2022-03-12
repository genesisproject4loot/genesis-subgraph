import { Transfer as TransferEvent } from "../generated/GenesisMana/GenesisMana";
import {
  Mana,
  Order,
  Bag,
  Transfer,
  Adventurer,
  UnclaimedMana,
  LostManaName
} from "../generated/schema";
import { GenesisMana as GenesisManaContract } from "../generated/GenesisMana/GenesisMana";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getTransfer, getWallets, isZeroAddress } from "./common";
import { LOST_MANA_CAP } from "./constants";
import {
  getGreatnessByItem,
  getItemClass,
  getItemLevel,
  getItemRank
} from "./glr_utils";
import { updateAdventurerWithLootTokenIds } from "./ga_mapping";
import { GenesisAdventurer } from "../generated/GenesisAdventurer/GenesisAdventurer";

export function handleTransfer(event: TransferEvent): void {
  let tokenId = event.params.tokenId;
  let wallets = getWallets(event.params.from, event.params.to, event);

  if (!isZeroAddress(wallets.fromWallet.id)) {
    wallets.fromWallet.manasHeld = wallets.fromWallet.manasHeld.minus(
      BigInt.fromI32(1)
    );
  }
  wallets.fromWallet.save();

  wallets.toWallet.manasHeld = wallets.toWallet.manasHeld.plus(
    BigInt.fromI32(1)
  );
  wallets.toWallet.save();

  let lootTokenId = "0";
  let mana = Mana.load(tokenId.toString());

  if (mana == null) {
    let contract = GenesisManaContract.bind(event.address);
    let manaDetails = contract.detailsByToken(tokenId);
    lootTokenId = manaDetails.value0.toString();

    // New Mana
    mana = createMana(event);
    let isLostMana = lootTokenId == "0";
    const lootTokenIdInt = isLostMana
      ? BigInt.fromI32(0)
      : BigInt.fromString(lootTokenId);

    // Deprecated
    mana.itemPower = getItemLevel(
      lootTokenIdInt,
      mana.inventoryId,
      mana.itemName
    );
    mana.itemRank = getItemRank(mana.inventoryId, mana.itemName);

    // GLR
    mana.itemClass = getItemClass(mana.inventoryId, mana.itemName);
    mana.itemGreatness = isLostMana
      ? 15
      : getGreatnessByItem(lootTokenIdInt, mana.inventoryId);
    mana.itemLevel = getItemLevel(
      lootTokenIdInt,
      mana.inventoryId,
      mana.itemName
    );
    mana.itemRating = mana.itemGreatness * mana.itemLevel;

    if (isZeroAddress(wallets.fromWallet.id)) {
      mana.OGMinterAddress = wallets.toWallet.address;

      // Create all lost mana names
      if (mana.id == "1") {
        createLostManaNames();
      }
    }

    // Update order
    let order = Order.load(mana.suffixId);
    if (!order) {
      order = new Order(mana.suffixId);
      order.manasHeld = BigInt.fromI32(1);
      order.save();
    } else {
      order.manasHeld = order.manasHeld.plus(BigInt.fromI32(1));
      order.save();
    }

    // Set Unclaimed mana to claimed
    if (!isLostMana) {
      const unclaimedMana = UnclaimedMana.load(
        `${lootTokenId}:${mana.inventoryId}`
      );
      if (unclaimedMana) {
        unclaimedMana.isClaimed = 1;
        unclaimedMana.save();
      }
    }
  }

  // Update currentOwner
  mana.currentOwner = wallets.toWallet.id;
  mana.save();

  if (lootTokenId != "0") {
    let bag = Bag.load(lootTokenId);
    if (bag != null) {
      if (bag.manasClaimed)
        bag.manasClaimed = bag.manasClaimed.plus(BigInt.fromI32(1));
      bag.manasUnclaimed = bag.manasUnclaimed.minus(BigInt.fromI32(1));
      bag.save();
    }
  }

  let transfer = getTransfer(event, wallets);
  transfer.mana = tokenId.toString();
  transfer.save();
  
  // Ring is the last item transfered in a GA Summon call
  if (mana.inventoryId == 7) {
    updateAdventurerIfSummoned(event);
  }
}

function createMana(event: TransferEvent): Mana {
  const tokenId = event.params.tokenId;
  let mana = new Mana(tokenId.toString());
  let contract = GenesisManaContract.bind(event.address);
  let manaDetails = contract.detailsByToken(tokenId);
  let lootTokenId = manaDetails.value0.toString();
  let orderId = manaDetails.value2.toString();

  mana.lootTokenId = lootTokenId;
  mana.itemName = manaDetails.value1;
  mana.suffixId = orderId;
  mana.orderId = orderId;
  mana.inventoryId = manaDetails.value3;
  mana.minted = event.block.timestamp;
  mana.tokenURI = contract.tokenURI(tokenId);
  return mana;
}

function createLostManaNames(): void {
  for (let i = 0; i < LOST_MANA_CAP.length; i++) {
    const caps = LOST_MANA_CAP[i];
    let composite = BigInt.fromString(caps[0]).toI32();
    const lostManaName = new LostManaName(caps[0]);
    const lootTokenId = BigInt.fromI32(floor(composite / 10));
    const itemType = composite % 10;
    const itemName = caps[3];
    const orderId = caps[1];
    const total = BigInt.fromString(caps[2]).toI32();
    lostManaName.lootTokenId = lootTokenId.toString();
    lostManaName.inventoryId = itemType;
    lostManaName.available = total;
    lostManaName.total = total;
    lostManaName.orderId = orderId;
    lostManaName.itemName = itemName;

    // GLR
    lostManaName.itemClass = getItemClass(itemType, itemName);
    lostManaName.itemGreatness = getGreatnessByItem(lootTokenId, itemType);
    lostManaName.itemLevel = getItemLevel(lootTokenId, itemType, itemName);
    lostManaName.itemRating =
      getGreatnessByItem(lootTokenId, itemType) *
      getItemLevel(lootTokenId, itemType, itemName);
    lostManaName.itemRank = getItemRank(itemType, itemName);
    lostManaName.save();
  }
}

function getTransferId(
  transaction: string,
  event: TransferEvent,
  minus: i32
): string {
  return (
    transaction + "-" + event.logIndex.minus(BigInt.fromI32(minus)).toString()
  );
}

function updateAdventurerIfSummoned(event: TransferEvent): void {
  const transaction = event.transaction.hash.toHex();
  const gaTransfer = Transfer.load(getTransferId(transaction, event, 16));

  if (gaTransfer == null || gaTransfer.adventurer == null) {
    return;
  }

  const tokenId = gaTransfer.adventurer as string;
  const adventurer = Adventurer.load(tokenId);
  if (adventurer == null) {
    return;
  }
  const weaponTransferId = getTransferId(transaction, event, 14);
  const chestTransferId = getTransferId(transaction, event, 12);
  const headTransferId = getTransferId(transaction, event, 10);
  const waistTransferId = getTransferId(transaction, event, 8);
  const footTransferId = getTransferId(transaction, event, 6);
  const handTransferId = getTransferId(transaction, event, 4);
  const neckTransferId = getTransferId(transaction, event, 2);
  const ringTransferId = getTransferId(transaction, event, 0);

  updateAdventurerWithLootTokenIds(
    adventurer as Adventurer,
    [
      getLootIdByManaTransferId(weaponTransferId),
      getLootIdByManaTransferId(chestTransferId),
      getLootIdByManaTransferId(headTransferId),
      getLootIdByManaTransferId(waistTransferId),
      getLootIdByManaTransferId(footTransferId),
      getLootIdByManaTransferId(handTransferId),
      getLootIdByManaTransferId(neckTransferId),
      getLootIdByManaTransferId(ringTransferId)
    ],
    GenesisAdventurer.bind(event.transaction.to as Address)
  );
  adventurer.weaponGM = getManaTokenId(weaponTransferId);
  adventurer.chestGM = getManaTokenId(chestTransferId);
  adventurer.headGM = getManaTokenId(headTransferId);
  adventurer.waistGM = getManaTokenId(waistTransferId);
  adventurer.footGM = getManaTokenId(footTransferId);
  adventurer.handGM = getManaTokenId(handTransferId);
  adventurer.neckGM = getManaTokenId(neckTransferId);
  adventurer.ringGM = getManaTokenId(ringTransferId);

  adventurer.save();
}

function getManaTokenId(transferId: string): string {
  const manaTransfer = Transfer.load(transferId);
  if (manaTransfer == null || manaTransfer.mana == null) {
    return "";
  }
  return manaTransfer.mana as string;
}

function getLootIdByManaTransferId(transferId: string): BigInt {
  const manaTokenId = getManaTokenId(transferId);
  if (manaTokenId.length == 0) {
    return BigInt.fromI32(0);
  }
  const mana = Mana.load(manaTokenId);
  if (mana == null || mana.lootTokenId == null) {
    return BigInt.fromI32(0);
  }
  return BigInt.fromString(mana.lootTokenId as string);
}
