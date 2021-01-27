import { Subscription } from "../nats-base-client/types.ts";

export interface JetStreamContext extends JetStream, JetStreamManager {}

export interface JetStream {
  publish(
    subj: string,
    data: Uint8Array,
    opts?: JetStreamPubOpts,
  ): Promise<PubAck>;
  subscribe(subj: string, opts?: JetStreamSubOpts): Promise<Subscription>;
}

export interface JetStreamPubOpts {
  id?: string;
  ttl?: number;
  lid?: string; // expected last message id
  str?: string; // stream name
  seq?: number; // expected last sequence
}

export interface JetStreamSubOpts {
  stream: string;
  pull?: number;
  mack?: boolean; // manual acks
  cfg: ConsumerConfig;
  queue?: string;
}

// export function AckNone(): JetStreamSubOpts {
//   return { ackPolicy: AckPolicy.None }
// }
//
// export function AckAll(): JetStreamSubOpts {
//   return { ackPolicy: AckPolicy.All }
// }
//
// export function AckExplicit(): JetStreamSubOpts {
//   return { ackPolicy: AckPolicy.Explicit }
// }

export interface JetStreamManager {
  // Create a stream.
  addStream(cfg: StreamConfig): Promise<StreamInfo>;
  // Update a stream
  updateStream(cfg: StreamConfig): Promise<StreamInfo>;
  // Delete a stream
  deleteStream(name: string): Promise<void>;
  // Stream information
  streamInfo(name: string): Promise<StreamInfo>;
  // Purge stream messages
  purgeStream(name: string): Promise<void>;
  // newStreamListener is used to return pages of StreamInfo
  // FIXME: this an iterator
  newStreamLister(): Promise<StreamLister>;
  // deleteMsg erases a message from a stream
  deleteMsg(name: string, seq: number): Promise<void>;

  // Create a consumer
  addConsumer(stream: string, cfg: ConsumerConfig): Promise<ConsumerInfo>;
  // Delete a consumer
  deleteConsumer(stream: string, consumer: string): Promise<void>;
  // Consumer information
  consumerInfo(stream: string, name: string): Promise<ConsumerInfo>;
  // newConsumerListener is used to return pages of ConsumerInfo
  // FIXME: this is an iterator
  newConsumerLister(stream: string): Promise<ConsumerLister>;

  // AccountInfo retrieves info about the JetStream usage from an account
  getAccountInfo(): Promise<AccountInfo>;
}

export interface JetStreamOptions {
  apiPrefix?: string;
  timeout?: number;
  direct?: boolean;
}

export interface StreamConfig {
  name?: string;
  subjects?: string[];
  retention?: RetentionPolicy;
  max_consumers?: number;
  max_msgs?: number;
  max_bytes?: number;
  discard?: DiscardPolicy;
  max_age?: number;
  max_msg_size?: number;
  storage?: StorageType;
  num_replicas?: number;
  no_ack?: boolean;
  duplicate_window?: number;
}

export enum RetentionPolicy {
  Limits = "limits",
  Interest = "interest",
  WorkQueue = "workqueue",
}

export enum DiscardPolicy {
  Old = "old",
  New = "new",
}

export enum StorageType {
  File = "file",
  Memory = "memory",
}

export interface StreamInfo {
  config: StreamConfig;
  created: number; // in ns
  state: StreamState;
  cluster?: ClusterInfo;
}

export interface StreamState {
  messages: number;
  bytes: number;
  first_seq: number;
  first_ts: number;
  last_seq: number;
  last_ts: string;
  consumer_count: number;
}

export interface ClusterInfo {
  name?: string;
  leader?: string;
  replicas?: PeerInfo[];
}

export interface PeerInfo {
  name: string;
  current: boolean;
  active: number; //ns
}

export interface StreamLister {
  page: StreamInfo[];
  err: Error;

  offset: number;
  pageInfo: ApiPaged;
}

export interface ApiPaged {
  total: number;
  offset: number;
  limit: number;
}

export interface ConsumerConfig {
  durable_name?: string;
  deliver_subject?: string;
  deliver_policy?: DeliverPolicy;
  opt_start_seq?: number;
  opt_start_time?: number;
  ack_policy?: AckPolicy;
  ack_wait?: number;
  max_deliver?: number;
  filter_subject?: string;
  replay_policy?: ReplayPolicy;
  rate_limit_bps?: number;
  sample_freq?: string;
  max_waiting?: number;
  max_ack_pending?: number;
}

export enum DeliverPolicy {
  All = "all",
  Last = "last",
  New = "new",
  ByStartSequence = "by_start_sequence",
  ByStartTime = "by_start_time",
}

export enum AckPolicy {
  None = "none",
  All = "all",
  Explicit = "explicit",
}

export enum ReplayPolicy {
  Instant = "instant",
  Original = "original",
}

export interface ConsumerInfo {
  stream_name: string;
  name: string;
  created: number;
  config: ConsumerConfig;
  delivered: SequencePair;
  ack_floor: SequencePair;
  num_ack_pending: number;
  num_redelivered: number;
  num_waiting: number;
  num_pending: number;
  cluster?: ClusterInfo;
}

export interface SequencePair {
  consumer_seq: number;
  stream_seq: number;
}

export interface ConsumerLister {
  stream: string;
  err: Error;
  offset: number;
  page: ConsumerInfo[];
  pageInfo: ApiPaged;
}

export interface AccountInfo {
  memory: number;
  storage: number;
  streams: number;
  limits: AccountLimits;
}

export interface AccountInfoResponse extends ApiResponse, AccountInfo {}

// from nats.go
export interface AccountLimits {
  max_memory: number;
  max_storage: number;
  max_streams: number;
  max_consumers: number;
}

// from nats.go
export interface ApiError {
  code: number;
  description: string;
}
// from nats.go
export interface ApiResponse {
  type: string;
  error?: ApiError;
}

export enum PubHeaders {
  MsgIdHdr = "Nats-Msg-Id",
  ExpectedStreamHdr = "Nats-Expected-Stream",
  ExpectedLastSeqHdr = "Nats-Expected-Last-Sequence",
  ExpectedLastMsgIdHdr = "Nats-Expected-Last-Msg-Id",
}

export interface PubAck {
  stream: string;
  seq: number;
  duplicate?: boolean;
}

export interface PubAckResponse extends ApiResponse, PubAck {}
export interface StreamInfoResponse extends ApiResponse, StreamInfo {}
