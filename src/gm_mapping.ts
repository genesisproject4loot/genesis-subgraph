import { Transfer as TransferEvent } from "../generated/GenesisMana/GenesisMana";
import {
  Mana,
  Order,
  Bag,
  Transfer,
  Wallet,
  Adventurer,
  UnclaimedMana
} from "../generated/schema";
import { GenesisMana as GenesisManaContract } from "../generated/GenesisMana/GenesisMana";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  getItemClass,
  getItemGreatness,
  getItemRank,
  isZeroAddress
} from "./common";

export function handleTransfer(event: TransferEvent): void {
  let fromAddress = event.params.from;
  let toAddress = event.params.to;
  let tokenId = event.params.tokenId;
  let fromId = fromAddress.toHex();
  let lootTokenId = "0";
  let isMinter = isZeroAddress(fromId);

  let fromWallet = loadWallet(event, fromAddress);
  if (!isMinter) {
    fromWallet.manasHeld = fromWallet.manasHeld.minus(BigInt.fromI32(1));
  }
  fromWallet.save();

  let toWallet = loadWallet(event, toAddress);
  toWallet.manasHeld = toWallet.manasHeld.plus(BigInt.fromI32(1));
  toWallet.save();

  let mana = Mana.load(tokenId.toString());

  if (mana != null) {
    // If transfer is from resurrectGA update GA object with mana.
    // Mana tokenId is not currently visible in GA contract
    let transferId =
      event.transaction.hash.toHex() +
      "-" +
      event.logIndex
        .minus(BigInt.fromI32((mana.inventoryId + 1) * 2))
        .toString();
    let adventurer = findAdventurerByTransferId(transferId);
    if (adventurer != null) {
      if (0 == mana.inventoryId) {
        adventurer.weaponGM = tokenId.toString();
      } else if (1 == mana.inventoryId) {
        adventurer.chestGM = tokenId.toString();
      } else if (2 == mana.inventoryId) {
        adventurer.headGM = tokenId.toString();
      } else if (3 == mana.inventoryId) {
        adventurer.waistGM = tokenId.toString();
      } else if (4 == mana.inventoryId) {
        adventurer.footGM = tokenId.toString();
      } else if (5 == mana.inventoryId) {
        adventurer.handGM = tokenId.toString();
      } else if (6 == mana.inventoryId) {
        adventurer.neckGM = tokenId.toString();
      } else if (7 == mana.inventoryId) {
        adventurer.ringGM = tokenId.toString();
      }
      adventurer.save();
    }
  } else {
    let contract = GenesisManaContract.bind(event.address);
    let manaDetails = contract.detailsByToken(tokenId);
    lootTokenId = manaDetails.value0.toString();

    // New Mana
    mana = createMana(event);
    let isLostMana = lootTokenId == "0";
    const lootTokenIdInt = isLostMana
      ? BigInt.fromI32(0)
      : BigInt.fromString(lootTokenId);

    mana.itemClass = getItemClass(mana.inventoryId, mana.itemName);
    mana.itemRank = getItemRank(mana.inventoryId, mana.itemName);
    mana.itemGreatness = getItemGreatness(mana.inventoryId, lootTokenIdInt);

    if (isMinter) {
      mana.OGMinterAddress = toAddress;
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
  mana.currentOwner = toWallet.id;
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

  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  transfer.mana = tokenId.toString();
  transfer.from = fromWallet.id;
  transfer.to = toWallet.id;
  transfer.txHash = event.transaction.hash;
  transfer.timestamp = event.block.timestamp;
  transfer.save();
}

function loadWallet(event: TransferEvent, address: Address): Wallet {
  const walletId = address.toHex();
  let wallet = Wallet.load(walletId);
  if (!wallet) {
    wallet = new Wallet(walletId);
    wallet.address = address;
    wallet.joined = event.block.timestamp;
    wallet.manasHeld = BigInt.fromI32(0);
  }
  return wallet;
}

function findAdventurerByTransferId(transferId: string): Adventurer | null {
  let gaTransfer = Transfer.load(transferId);
  if (gaTransfer == null || gaTransfer.adventurer == null) {
    return null;
  }
  return Adventurer.load(gaTransfer.adventurer as string);
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
