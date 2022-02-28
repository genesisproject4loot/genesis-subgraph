import {
  Transfer as TransferEvent,
  NameLostMana
} from "../generated/GenesisAdventurer/GenesisAdventurer";
import {
  Adventurer,
  Order,
  Transfer,
  Wallet,
  LostManaName
} from "../generated/schema";
import { GenesisAdventurer } from "../generated/GenesisAdventurer/GenesisAdventurer";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  isZeroAddress,
  arrayToI32,
  getBagGreatness,
  getBagLevel,
  getBagRating
} from "./common";

export function handleNameLostMana(event: NameLostMana): void {
  const tokenId = event.params.tokenId;
  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer) {
    updateAdventurer(event.address, adventurer);
    adventurer.save();
  }

  const items = event.params.itemsToName;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lootTokenId = item[0].toBigInt();
    const itemIndex = item[1].toI32();
    const composite = lootTokenId.toI32() * 10 + itemIndex;
    const lostManaName = LostManaName.load(
      BigInt.fromI32(composite).toString()
    );
    if (lostManaName && lostManaName.available > 0) {
      lostManaName.available = lostManaName.available - 1;
      lostManaName.save();
    }
  }
}

export function handleTransfer(event: TransferEvent): void {
  let fromAddress = event.params.from;
  let toAddress = event.params.to;
  let tokenId = event.params.tokenId;
  let fromId = fromAddress.toHex();
  let fromWallet = Wallet.load(fromId);

  if (!fromWallet) {
    fromWallet = new Wallet(fromId);
    fromWallet.address = fromAddress;
    fromWallet.joined = event.block.timestamp;
    fromWallet.adventurersHeld = BigInt.fromI32(0);
    fromWallet.save();
  } else {
    if (!isZeroAddress(fromId)) {
      fromWallet.adventurersHeld = fromWallet.adventurersHeld.minus(
        BigInt.fromI32(1)
      );
      fromWallet.save();
    }
  }

  let toId = toAddress.toHex();
  let toWallet = Wallet.load(toId);
  if (!toWallet) {
    toWallet = new Wallet(toId);
    toWallet.address = toAddress;
    toWallet.joined = event.block.timestamp;
    toWallet.adventurersHeld = BigInt.fromI32(1);
    toWallet.save();
  } else {
    toWallet.adventurersHeld = toWallet.adventurersHeld.plus(BigInt.fromI32(1));
    toWallet.save();
  }

  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer != null) {
    adventurer.currentOwner = toWallet.id;
    adventurer.save();
  } else {
    adventurer = new Adventurer(tokenId.toString());
    updateAdventurer(event.address, adventurer);
    adventurer.currentOwner = toWallet.id;
    adventurer.minted = event.block.timestamp;

    if (isZeroAddress(fromId)) {
      adventurer.OGMinterAddress = toAddress;
    }
    adventurer.save();

    let order = Order.load(adventurer.suffixId);
    if (!order) {
      order = new Order(adventurer.suffixId);
      order.adventurersHeld = BigInt.fromI32(1);
      order.save();
    } else {
      order.adventurersHeld = order.adventurersHeld.plus(BigInt.fromI32(1));
      order.save();
    }
  }

  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  transfer.adventurer = tokenId.toString();
  transfer.from = fromWallet.id;
  transfer.to = toWallet.id;
  transfer.txHash = event.transaction.hash;
  transfer.timestamp = event.block.timestamp;
  transfer.save();
}

function updateAdventurer(address: Address, adventurer: Adventurer): void {
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
  const contract = GenesisAdventurer.bind(address);
  const tokenId = BigInt.fromString(adventurer.id);
  const lootTokenIds = arrayToI32(
    contract.getLootTokenIds(BigInt.fromString(adventurer.id))
  );
  const items = [
    [lootTokenIds[0].toString(), "0", adventurer.weapon],
    [lootTokenIds[1].toString(), "1", adventurer.chest],
    [lootTokenIds[2].toString(), "2", adventurer.head],
    [lootTokenIds[3].toString(), "3", adventurer.waist],
    [lootTokenIds[4].toString(), "4", adventurer.foot],
    [lootTokenIds[5].toString(), "5", adventurer.hand],
    [lootTokenIds[6].toString(), "6", adventurer.neck],
    [lootTokenIds[7].toString(), "7", adventurer.ring]
  ];

  adventurer.chest = contract.getChest(tokenId).toString();
  adventurer.foot = contract.getFoot(tokenId).toString();
  adventurer.hand = contract.getHand(tokenId).toString();
  adventurer.head = contract.getHead(tokenId).toString();
  adventurer.neck = contract.getNeck(tokenId).toString();
  adventurer.ring = contract.getRing(tokenId).toString();
  adventurer.waist = contract.getWaist(tokenId).toString();
  adventurer.weapon = contract.getWeapon(tokenId).toString();
  adventurer.order = contract.getOrder(tokenId).toString();
  adventurer.orderId = suffixArray.indexOf(adventurer.order).toString();
  adventurer.suffixId = suffixArray.indexOf(adventurer.order).toString();
  adventurer.orderColor = contract.getOrderColor(tokenId).toString();
  adventurer.orderCount = contract.getOrderCount(tokenId).toString();
  adventurer.tokenURI = contract.tokenURI(tokenId);
  adventurer.lootTokenIds = lootTokenIds;

  adventurer.greatness = getBagGreatness(items);
  adventurer.level = getBagLevel(items);
  adventurer.rating = getBagRating(items);
}
