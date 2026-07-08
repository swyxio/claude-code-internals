/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed Remote Control / DirectConnect boundary.
 * Provenance: remote.startup, remote.peer-isolation, entrypoint.routing,
 * socket.directory-mode.
 * Confidence: observed = startup switch, peer-machine isolation option, and
 * local socket-directory mode check; derived = transport lifecycle contract;
 * hypothesis = endpoint selection, authentication, codec, and wire framing,
 * which are deliberately injected rather than asserted here.
 */

export interface DirectConnectOptions {
  sessionId?: string;
  isolatePeerMachines: boolean;
  abortSignal: AbortSignal;
  connectionContext?: unknown;
}

/** Endpoint shape and credential attachment are outside the anchored evidence. */
export interface RemoteEndpointResolver {
  resolve(options: DirectConnectOptions): Promise<unknown>;
}

/** Framing and serialization are injected because the anchors do not prove them. */
export interface RemoteCodec<Message = unknown, Frame = unknown> {
  encode(message: Message): Frame;
  decode(frame: Frame): Message[];
}

export interface RemoteChannel<Frame = unknown> {
  open(signal: AbortSignal): Promise<void>;
  receive(signal: AbortSignal): AsyncIterable<Frame>;
  send(frame: Frame): Promise<void>;
  close(): Promise<void>;
}

export interface RemoteChannelFactory<Frame = unknown> {
  connect(endpoint: unknown): RemoteChannel<Frame>;
}

/**
 * The observed peer-isolation setting implies a classification/approval gate,
 * but the message field carrying machine identity is not asserted here.
 */
export interface PeerIsolationPolicy<Message = unknown> {
  classify(
    message: Message,
  ):
    | "local"
    | "cross-machine-approved"
    | "cross-machine-needs-approval"
    | "reject";
}

export interface RemoteDelivery<Message = unknown> {
  message: Message;
  disposition: "deliver" | "needs-peer-approval";
}

export class DirectConnectTransport<Message = unknown, Frame = unknown> {
  readonly #queue: RemoteDelivery<Message>[] = [];
  #channel?: RemoteChannel<Frame>;
  #ready = false;
  #closed = false;
  #pump?: Promise<void>;

  constructor(
    private readonly options: DirectConnectOptions,
    private readonly endpoints: RemoteEndpointResolver,
    private readonly channels: RemoteChannelFactory<Frame>,
    private readonly codec: RemoteCodec<Message, Frame>,
    private readonly peerPolicy: PeerIsolationPolicy<Message>,
  ) {}

  async connect(): Promise<void> {
    if (this.#closed) throw new Error("Transport already closed");
    const endpoint = await this.endpoints.resolve(this.options);
    this.#channel = this.channels.connect(endpoint);
    await this.#channel.open(this.options.abortSignal);
    this.#ready = true;
    this.#pump = this.consume(this.#channel);
    this.options.abortSignal.addEventListener(
      "abort",
      () => void this.close(),
      { once: true },
    );
  }

  async write(message: Message): Promise<void> {
    if (!this.#ready || !this.#channel)
      throw new Error("Transport is not ready");
    await this.#channel.send(this.codec.encode(message));
  }

  drain(): RemoteDelivery<Message>[] {
    return this.#queue.splice(0);
  }

  private async consume(channel: RemoteChannel<Frame>): Promise<void> {
    for await (const frame of channel.receive(this.options.abortSignal)) {
      for (const message of this.codec.decode(frame)) {
        if (!this.options.isolatePeerMachines) {
          this.#queue.push({ message, disposition: "deliver" });
          continue;
        }
        const classification = this.peerPolicy.classify(message);
        if (classification === "reject") continue;
        this.#queue.push({
          message,
          disposition:
            classification === "cross-machine-needs-approval"
              ? "needs-peer-approval"
              : "deliver",
        });
      }
    }
    this.#ready = false;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#ready = false;
    await this.#channel?.close();
    await this.#pump?.catch(() => undefined);
  }
}
