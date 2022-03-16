/*
 * Copyright (C) 2022 Zilliqa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { exit } from "process";

import { Zilliqa } from "@zilliqa-js/zilliqa";
import { getAddressFromPrivateKey, schnorr } from "@zilliqa-js/crypto";
import { API, FAUCET_PARAMS, TX_PARAMS } from "../config";
import { scillaJSONParams } from "@zilliqa-js/scilla-json-utils";
const M = 10;
const N = 10;
const DELAY = 3 * 1000;

const GENESIS_PRIVATE_KEY = process.env["PRIVATE_KEY"];

const zilliqa = new Zilliqa(API);
zilliqa.wallet.addByPrivateKey(GENESIS_PRIVATE_KEY as string);

let globalTestAccounts: Array<{
  privateKey: string;
  address: string;
}> = [];

beforeAll(async () => {
  const accounts = Array.from({ length: M }, schnorr.generatePrivateKey).map(
    (privateKey) => ({
      privateKey,
      address: getAddressFromPrivateKey(privateKey),
    })
  );
  for (const { privateKey, address } of accounts) {
    zilliqa.wallet.addByPrivateKey(privateKey);
    const tx = await zilliqa.blockchain.createTransaction(
      zilliqa.transactions.new(
        {
          ...FAUCET_PARAMS,
          toAddr: address,
        },
        false
      )
    );
    if (!tx.getReceipt()?.success) {
      throw new Error();
    }
  }
  globalTestAccounts = accounts;
});

describe("regression test: no timeout", () => {
  // This test is to prevent the following issue:
  // Problem: Sometimes client never gets the response for CreateTransaction.
  // Cause: https://github.com/Zilliqa/Zilliqa/commit/3978f45a02a09168edab82c708b0a5b600ae5a4c
  it(`checks each request gets a response at least in ${DELAY} ms`, async () => {
    const calls = async (x: number) => {
      for (let i = 0; i < N; i++) {
        const key = `${x}-${i}`;

        const timeoutID = setTimeout(() => {
          console.log(key + ": timeout");
          exit(1);
        }, DELAY);

        zilliqa.wallet.setDefault(globalTestAccounts[x].address);

        const res = await zilliqa.blockchain.createTransactionWithoutConfirm(
          zilliqa.transactions.new(
            {
              ...TX_PARAMS,
              toAddr: "0x0000000000000000000000000000000000000000",
              code: "scilla_version 0 contract Foo()",
              data: JSON.stringify(
                scillaJSONParams({
                  _scilla_version: ["Uint32", "0"],
                  initial_contract_owner: [
                    "ByStr20",
                    "0x0000000000000000000000000000000000000000",
                  ],
                })
              ),
            },
            true
          )
        );

        clearTimeout(timeoutID);
        expect(res.status).toBe(0);
      }
    };

    await Promise.all(globalTestAccounts.map((_, i) => calls(i)));
  });
});
