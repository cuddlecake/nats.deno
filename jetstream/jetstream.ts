import type {
  AccountInfo,
  AccountInfoResponse,
  ConsumerConfig,
  ConsumerInfo,
  ConsumerLister,
  JetStreamContext,
  JetStreamOptions,
  JetStreamPubOpts,
  JetStreamSubOpts,
  PubAck,
  PubAckResponse,
  StreamConfig,
  StreamInfo,
  StreamInfoResponse,
  StreamLister,
} from "./types.ts";
import {
  Codec,
  Empty,
  ErrorCode,
  headers,
  JSONCodec,
  NatsConnection,
  NatsError,
  Subscription,
} from "../nats-base-client/mod.ts";
import { NatsConnectionImpl } from "../nats-base-client/nats.ts";
import { PubHeaders } from "./types.ts";

const defaultPrefix = "$JS.API";
const defaultTimeout = 5000;

export async function JetStream(
  nc: NatsConnection,
  opts?: JetStreamOptions,
): Promise<JetStreamContext> {
  const ctx = new JetStreamContextImpl(nc, opts);
  if (ctx.opts.direct) {
    return ctx;
  }
  try {
    await ctx.getAccountInfo();
  } catch (err) {
    let ne = err as NatsError;
    if (ne.code === ErrorCode.NO_RESPONDERS) {
      ne = NatsError.errorForCode(ErrorCode.JETSTREAM_NOT_ENABLED);
    }
    throw ne;
  }
  return ctx;
}

interface reqOpts {
  template: string;
}

class JetStreamContextImpl implements JetStreamContext {
  nc: NatsConnection;
  opts: JetStreamOptions;
  jc: Codec<unknown>;
  prefix: string;
  timeout: number;

  constructor(nc: NatsConnection, opts?: JetStreamOptions) {
    this.nc = nc;
    const nci = nc as NatsConnectionImpl;
    if (nci.info && !nci.info.headers) {
      throw new Error("headers are required");
    }
    if (!nci.options.noResponders) {
      throw new Error("noResponders option is required for jetstream");
    }

    this.opts = opts ? opts : {} as JetStreamOptions;
    this._parseOpts();
    this.prefix = this.opts.apiPrefix!;
    this.timeout = this.opts.timeout!;
    this.jc = JSONCodec();
  }

  _parseOpts() {
    let prefix = this.opts.apiPrefix || defaultPrefix;
    if (!prefix || prefix.length === 0) {
      throw new Error("invalid empty prefix");
    }
    const c = prefix[prefix.length - 1];
    if (c === ".") {
      prefix = prefix.substr(0, prefix.length - 1);
    }
    this.opts.apiPrefix = prefix;
    this.opts.timeout = this.opts.timeout || defaultTimeout;
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const m = await this.nc.request(
      `${this.prefix}.INFO`,
      Empty,
      { timeout: this.timeout },
    );
    const ai = this.jc.decode(m.data) as AccountInfoResponse;
    if (ai.error && ai.error.code === 503) {
      throw NatsError.errorForCode(
        ErrorCode.JETSTREAM_NOT_ENABLED,
        new Error(ai.error.description),
      );
    }
    return ai;
  }

  addConsumer(stream: string, cfg: ConsumerConfig): Promise<ConsumerInfo> {
    return Promise.reject();
  }

  async addStream(cfg = {} as StreamConfig): Promise<StreamInfo> {
    if (!cfg.name) {
      throw Error("stream name is required");
    }
    const m = await this.nc.request(
      `${this.prefix}.STREAM.CREATE.${cfg.name}`,
      this.jc.encode(cfg),
    );
    const cr = this.jc.decode(m.data) as StreamInfoResponse;
    if (cr.error && cr.error.description) {
      throw new Error(cr.error.description);
    }
    return cr as StreamInfo;
  }

  consumerInfo(stream: string, name: string): Promise<ConsumerInfo> {
    return Promise.reject();
  }

  deleteConsumer(stream: string, consumer: string): Promise<void> {
    return Promise.reject();
  }

  deleteMsg(name: string, seq: number): Promise<void> {
    return Promise.reject();
  }

  deleteStream(name: string): Promise<void> {
    return Promise.reject();
  }

  newConsumerLister(stream: string): Promise<ConsumerLister> {
    return Promise.resolve({} as ConsumerLister);
  }

  newStreamLister(): Promise<StreamLister> {
    return Promise.resolve({} as StreamLister);
  }

  purgeStream(name: string): Promise<void> {
    return Promise.reject();
  }

  async streamInfo(name: string): Promise<StreamInfo> {
    if (name === "") {
      throw new Error("name is required");
    }
    const m = await this.nc.request(
      `${this.prefix}.STREAM.INFO.${name}`,
      Empty,
      { timeout: this.timeout },
    );
    const sir = this.jc.decode(m.data) as StreamInfoResponse;
    if (sir.error && sir.error.description) {
      throw new Error(sir.error.description);
    }
    return sir as StreamInfo;
  }

  updateStream(cfg: StreamConfig): Promise<StreamInfo> {
    return Promise.reject();
  }

  async publish(
    subj: string,
    data: Uint8Array,
    opts = {} as JetStreamPubOpts,
  ): Promise<PubAck> {
    opts.ttl = opts.ttl || this.timeout;

    const mh = headers();
    if (opts.id) {
      mh.set(PubHeaders.MsgIdHdr, opts.id);
    }
    if (opts.lid) {
      mh.set(PubHeaders.ExpectedLastMsgIdHdr, opts.lid);
    }
    if (opts.str) {
      mh.set(PubHeaders.ExpectedStreamHdr, opts.str);
    }
    if (opts.seq && opts.seq > 0) {
      mh.set(PubHeaders.ExpectedLastSeqHdr, `${opts.seq}`);
    }

    const m = await this.nc.request(
      subj,
      data,
      { timeout: opts.ttl, headers: mh },
    );
    const pa = this.jc.decode(m.data) as PubAckResponse;
    if (pa.error && pa.error.description) {
      throw new NatsError(pa.error.description, `${pa.error.code}`);
    }
    if (pa.stream === "") {
      throw NatsError.errorForCode(ErrorCode.INVALID_JS_ACK);
    }
    return pa;
  }

  subscribe(subj: string, opts?: JetStreamSubOpts): Promise<Subscription> {
    return Promise.reject();
  }
}
