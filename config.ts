import { bytes, units } from "@zilliqa-js/util";
import { Long, BN } from "@zilliqa-js/util";
export const API = `http://localhost:${process.env["PORT"]}`; // Zilliqa Isolated Server

const CHAIN_ID = Number(process.env["CHAIN_ID"]);
const MSG_VER = Number(process.env["MSG_VER"]);
const VERSION = bytes.pack(CHAIN_ID, MSG_VER);
export const GAS_PRICE = units.toQa("2000", units.Units.Li);

const GAS_LIMIT = Long.fromNumber(100000);

export const TX_PARAMS = {
  version: VERSION,
  amount: new BN(0),
  gasPrice: GAS_PRICE,
  gasLimit: GAS_LIMIT,
};

export const FAUCET_PARAMS = {
  version: VERSION,
  amount: new BN(units.toQa("100000000", units.Units.Zil)),
  gasPrice: GAS_PRICE,
  gasLimit: Long.fromNumber(50),
};
