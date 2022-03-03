import {
  Transfer as TransferEvent,
  NameLostMana,
  NameAdventurer
} from "../generated/GenesisAdventurer/GenesisAdventurer";
import {
  Adventurer,
  Order,
  Transfer,
  Wallet,
  LostManaName
} from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import { isZeroAddress, updateAdventurer } from "./common";

export function handleNameLostMana(event: NameLostMana): void {
  const tokenId = event.params.tokenId;
  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer) {
    updateAdventurer(event.address, adventurer, tokenId, []);
    adventurer.save();
  }
  const items = event.params.itemsToName;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lootTokenId = item.lootTokenId;
    const itemIndex = item.inventoryId;
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

export function handleNameAdventurer(event: NameAdventurer): void {
  const tokenId = event.params.tokenId;
  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer) {
    updateAdventurer(event.address, adventurer, tokenId, []);
    adventurer.save();
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
    updateAdventurer(event.address, adventurer, tokenId, [
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0),
      BigInt.fromI32(0)
    ]);
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
