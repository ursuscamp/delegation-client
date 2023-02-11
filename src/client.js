import Alpine from "alpinejs";
import jsonFormatHighlight from "json-format-highlight";
import { getEventHash, nip26, relayInit, nip19 } from "nostr-tools";
import { getDelegator } from "nostr-tools/nip26";

// const RELAY = "wss://relay.snort.social";
const RELAY = "wss://relay.damus.io";

Alpine.data("client", () => ({
  state: "init",
  compat: false,
  pubkey: "",
  message: "testing delegation",
  event: {},
  formattedJson: "",
  logs: [],
  relay: null,
  pub: null,
  published: true,

  isstate(q) {
    return this.state === q;
  },

  async loadPubkey() {
    this.pubkey = await window.nostr.getPublicKey();
    this.compat = true;
  },

  async compose() {
    let event = {
      kind: 1,
      created_at: Math.round(Date.now() / 1000),
      content: this.message,
      pubkey: this.pubkey,
      tags: [],
    };
    event.id = getEventHash(event);
    event = await window.nostr.signEvent(event);
    this.compat = getDelegator(event);
    this.formattedJson = jsonFormatHighlight(event);
    this.event = event;
  },

  log(msg) {
    this.logs.unshift(["log", msg]);
  },

  err(msg) {
    this.logs.unshift(["err", msg]);
  },

  send() {
    try {
      this.log(`Connection to relay ${RELAY}`);
      const ws = new WebSocket(RELAY);
      const sender = this;
      ws.onopen = function (e) {
        sender.log("Connection open");
        sender.log(`Sending event ${sender.event}`);
        ws.send(JSON.stringify(["EVENT", sender.event]));
      };

      ws.onmessage = function (event) {
        sender.log(`Message from server: ${event.data}`);
      };

      ws.onerror = function () {
        sender.err("Connection error");
      };

      // const relay = relayInit(RELAY);

      // // Respond to relay events
      // relay.on("connect", () => {
      //   this.log(`Connected to relay ${relay.url}`);
      // });
      // relay.on("error", () => {
      //   throw new Error(`Failed to connect to relay ${relay.url}`);
      // });

      // this.log(`Publishing event ${this.event.id}`);

      // // Publish event
      // let pub = relay.publish(this.pureEvent);
      // pub.on("ok", () => {
      //   this.log("Event published successfully!");
      //   this.published = true;
      // });
      // pub.on("seen", () => {
      //   this.log("Event was seen");
      // });
      // pub.on("failed", () => {
      //   throw new Error(`Failed to publish event ${this.event.id}!`);
      // });

      // this.pub = pub;
      // this.relay = relay;
    } catch (error) {
      this.err(error.message);
    }
  },

  async advance() {
    this.compat = false;
    switch (this.state) {
      case "init":
        this.state = "pubkey";
        break;
      case "pubkey":
        this.state = "compose";
        break;
      case "compose":
        await this.compose();
        this.state = "review";
        break;
      case "review":
        this.state = "send";
        await this.send();
        break;
      default:
        break;
    }
  },

  get pureEvent() {
    return JSON.parse(JSON.stringify(this.event));
  },

  get npub() {
    return nip19.npubEncode(this.pubkey);
  },

  get noteLink() {
    if (!this.event.id) {
      return "";
    }
    let noteid = nip19.noteEncode(this.event.id);
    let url = `https://snort.social/e/${noteid}`;
    return url;
  },
}));

Alpine.start();
