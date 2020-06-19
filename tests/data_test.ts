/*
 * Copyright 2018-2020 The NATS Authors
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
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { DataBuffer } from "../nats-base-client/mod.ts";

Deno.test("empty", () => {
  let buf = new DataBuffer();
  assertEquals(0, buf.length());
  assertEquals(0, buf.size());
  assertEquals(0, buf.drain(1000).byteLength);
  assertEquals(0, buf.peek().byteLength);
});

Deno.test("simple", () => {
  let buf = new DataBuffer();
  buf.fill(DataBuffer.fromAscii("Hello"));
  buf.fill(DataBuffer.fromAscii(" "));
  buf.fill(DataBuffer.fromAscii("World"));
  assertEquals(3, buf.length());
  assertEquals(11, buf.size());
  let p = buf.peek();
  assertEquals(11, p.byteLength);
  assertEquals("Hello World", DataBuffer.toAscii(p));
  let d = buf.drain();
  assertEquals(11, d.byteLength);
  assertEquals("Hello World", DataBuffer.toAscii(d));
});

Deno.test("from empty", () => {
  //@ts-ignore
  let a = DataBuffer.fromAscii(undefined);
  assertEquals(0, a.byteLength);
});