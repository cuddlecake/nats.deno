/*
 * Copyright 2020 The NATS Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//@ts-ignore
import { ConnectionOptions } from "./types.ts";

let transportFactory: TransportFactory;
export function setTransportFactory(fn: TransportFactory): void {
  transportFactory = fn;
}

export function newTransport(): Transport {
  if (typeof transportFactory !== "function") {
    throw new Error("transport is not set");
  }
  return transportFactory();
}

export interface TransportFactory {
  (): Transport;
}

export interface Inbound {
  parse(buf: Uint8Array): void;
}

export interface Transport extends AsyncIterable<Uint8Array> {
  readonly isClosed: boolean;
  readonly lang: string;
  readonly version: string;
  readonly closeError?: Error;

  connect(
    hp: { hostname: string; port: number },
    opts: ConnectionOptions,
    inbound: Inbound
  ): Promise<void>;

  [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array>;

  isEncrypted(): boolean;

  send(frame: Uint8Array): Promise<void>;

  close(err?: Error): Promise<void>;

  disconnect(): void;

  closed(): Promise<void | Error>;
}
