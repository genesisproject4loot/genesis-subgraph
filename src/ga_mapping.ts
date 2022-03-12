import {
  Transfer as TransferEvent,
  NameLostMana,
  NameAdventurer,
  GenesisAdventurer
} from "../generated/GenesisAdventurer/GenesisAdventurer";
import { Adventurer, Order, LostManaName } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getTransfer, getWallets, isZeroAddress } from "./common";
import {
  getAdventurerGreatness,
  getAdventurerLevel,
  getAdventurerRating
} from "./glr_utils";

const V3_CONTRACT_START_TOKEN_ID = BigInt.fromI32(480);

export function handleTransfer(event: TransferEvent): void {
  let tokenId = event.params.tokenId;
  let wallets = getWallets(event.params.from, event.params.to, event);

  if (!isZeroAddress(wallets.fromWallet.id)) {
    wallets.fromWallet.adventurersHeld = wallets.fromWallet.adventurersHeld.minus(
      BigInt.fromI32(1)
    );
  }
  wallets.fromWallet.save();

  wallets.toWallet.adventurersHeld = wallets.toWallet.adventurersHeld.plus(
    BigInt.fromI32(1)
  );
  wallets.toWallet.save();

  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer != null) {
    adventurer.currentOwner = wallets.toWallet.id;
    adventurer.save();
  } else {
    adventurer = new Adventurer(tokenId.toString());
    let contract = GenesisAdventurer.bind(event.address);

    // Loot Token Ids aren't availble yet on inital GA Transfer
    // resurrectGA call handler will fill in lootIds
    updateGAdventurerWithLootTokenIds(adventurer, [], contract);
    adventurer.currentOwner = wallets.toWallet.id;
    adventurer.minted = event.block.timestamp;

    if (isZeroAddress(wallets.fromWallet.id)) {
      adventurer.OGMinterAddress = wallets.toWallet.address;
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

    // New V3 contract updates renderer
    if (tokenId.equals(V3_CONTRACT_START_TOKEN_ID)) {
      refreshAdventurersBeforeTokenId(
        V3_CONTRACT_START_TOKEN_ID,
        event.address
      );
    }
  }

  let transfer = getTransfer(event, wallets);
  transfer.adventurer = tokenId.toString();
  transfer.save();
}

export function handleNameLostMana(event: NameLostMana): void {
  refreshAdventurerByTokenId(event.params.tokenId, event.address);

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
  refreshAdventurerByTokenId(event.params.tokenId, event.address);
}

function refreshAdventurersBeforeTokenId(
  tokenId: BigInt,
  contractAddress: Address
): void {
  if (tokenId.lt(BigInt.fromI32(1))) {
    return;
  }
  for (let i = tokenId.toI32() - 1; i > 0; i--) {
    refreshAdventurerByTokenId(BigInt.fromI32(i), contractAddress);
  }
}

function refreshAdventurerByTokenId(
  tokenId: BigInt,
  contractAddress: Address
): void {
  let adventurer = Adventurer.load(tokenId.toString());
  if (adventurer != null) {
    let contract = GenesisAdventurer.bind(contractAddress);
    updateGAdventurerWithLootTokenIds(
      adventurer,
      contract.getLootTokenIds(tokenId),
      contract
    );
    adventurer.save();
  }
}

export function updateGAdventurerWithLootTokenIds(
  adventurer: Adventurer,
  lootTokenIds: BigInt[],
  contract: GenesisAdventurer
): void {
  const tokenId = BigInt.fromString(adventurer.id);
  adventurer.chest = contract.getChest(tokenId).toString();
  adventurer.foot = contract.getFoot(tokenId).toString();
  adventurer.hand = contract.getHand(tokenId).toString();
  adventurer.head = contract.getHead(tokenId).toString();
  adventurer.neck = contract.getNeck(tokenId).toString();
  adventurer.ring = contract.getRing(tokenId).toString();
  adventurer.waist = contract.getWaist(tokenId).toString();
  adventurer.weapon = contract.getWeapon(tokenId).toString();
  adventurer.order = contract.getOrder(tokenId).toString();
  adventurer.orderId = getOrderId(adventurer.order);
  adventurer.suffixId = getOrderId(adventurer.order);
  adventurer.orderColor = contract.getOrderColor(tokenId).toString();
  adventurer.orderCount = contract.getOrderCount(tokenId).toString();

  if (lootTokenIds.length == 0) {
    adventurer.lootTokenIds = [];
    adventurer.greatness = 0;
    adventurer.level = 0;
    adventurer.rating = 0;
  } else {
    adventurer.lootTokenIds = lootTokenIds.map(function(
      tokenId: BigInt,
      index: i32,
      array: BigInt[]
    ): i32 {
      return tokenId.toI32();
    });
    adventurer.greatness = getAdventurerGreatness(adventurer);
    adventurer.level = getAdventurerLevel(adventurer);
    adventurer.rating = getAdventurerRating(adventurer);
  }

  adventurer.tokenURI = contract.tokenURI(tokenId);
}

function getOrderId(orderName: string): string {
  const suffixArray = [
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
  return suffixArray.indexOf(orderName).toString();
}
