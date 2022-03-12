import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Transfer, Wallet } from "../generated/schema";

export class WalletInterface {
  fromWallet: Wallet;
  toWallet: Wallet;
}

export function isZeroAddress(string: string): boolean {
  return string == "0x0000000000000000000000000000000000000000";
}

export function getWallets(
  from: Address,
  to: Address,
  event: ethereum.Event
): WalletInterface {
  let fromAddress = from;
  let toAddress = to;

  let fromId = fromAddress.toHex();
  let fromWallet = Wallet.load(fromId);
  if (!fromWallet) {
    fromWallet = new Wallet(fromId);
    fromWallet.address = fromAddress;
    fromWallet.joined = event.block.timestamp;
    fromWallet.bagsHeld = BigInt.fromI32(0);
    fromWallet.manasHeld = BigInt.fromI32(0);
    fromWallet.adventurersHeld = BigInt.fromI32(0);
  }

  let toId = toAddress.toHex();
  let toWallet = Wallet.load(toId);
  if (!toWallet) {
    toWallet = new Wallet(toId);
    toWallet.address = toAddress;
    toWallet.joined = event.block.timestamp;
    toWallet.bagsHeld = BigInt.fromI32(0);
    toWallet.manasHeld = BigInt.fromI32(0);
    toWallet.adventurersHeld = BigInt.fromI32(0);
  }

  return {
    fromWallet,
    toWallet
  };
}

export function getTransfer(
  event: ethereum.Event,
  wallet: WalletInterface
): Transfer {
  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  transfer.from = wallet.fromWallet.id;
  transfer.to = wallet.toWallet.id;
  transfer.txHash = event.transaction.hash;
  transfer.timestamp = event.block.timestamp;

  return transfer;
}
