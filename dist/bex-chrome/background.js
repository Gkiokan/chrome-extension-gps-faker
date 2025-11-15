(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // node_modules/@quasar/app-vite/exports/bex/private/bex-bridge.js
  var portNameRE = /^background$|^app$|^content@/;
  var { runtime } = false ? browser : chrome;
  function getRandomId(max) {
    return Math.floor(Math.random() * max);
  }
  var _type, _debug, _banner, _BexBridge_instances, onPortChange_fn, triggerMessageEvent_fn, cleanupPort_fn, onPacket_fn, sendPacket_fn, sendMessage_fn, onMessage_fn;
  var BexBridge = class {
    /**
     * @param {{ type: 'background' | 'content' | 'app', name?: string, debug?: boolean }} options
     */
    constructor({ type, name = "", debug }) {
      __privateAdd(this, _BexBridge_instances);
      // Public properties
      /** @type {string} */
      __publicField(this, "portName", null);
      /** @type {boolean} */
      __publicField(this, "isConnected", false);
      /** @type {{ type: 'on' | 'once', callback: (message: Message) => void }[]} */
      __publicField(this, "listeners", {});
      /** @type {{ [portName: string]: chrome.runtime.Port }} */
      __publicField(this, "portMap", {});
      /** @type {string[]} */
      __publicField(this, "portList", []);
      /** @type {{ [id: string]: { portName: string, resolve: (payload: any) => void, reject: (err: any) => void } }} */
      __publicField(this, "messageMap", {});
      /** @type {{ [id: string]: { portName: string, number: number, messageType: string, messageProps: any, payload: any[] } }} */
      __publicField(this, "chunkMap", {});
      // Private properties
      /** @type {'background' | 'content' | 'app'} */
      __privateAdd(this, _type);
      /** @type {boolean} */
      __privateAdd(this, _debug, false);
      /** @type {string} */
      __privateAdd(this, _banner);
      this.portName = type;
      __privateSet(this, _type, type);
      if (type === "content") {
        this.portName = `${type}@${name}-${getRandomId(1e4)}`;
      }
      __privateSet(this, _banner, `[QBex|${this.portName}]`);
      __privateSet(this, _debug, debug === true);
      if (type !== "background") {
        this.on("@quasar:ports", ({ payload }) => {
          this.portList = payload.portList;
          if (payload.removed !== void 0) {
            __privateMethod(this, _BexBridge_instances, cleanupPort_fn).call(this, payload.removed);
          }
        });
        return;
      }
      this.isConnected = true;
      const onPacket = __privateMethod(this, _BexBridge_instances, onPacket_fn).bind(this);
      runtime.onConnect.addListener((port) => {
        if (portNameRE.test(port.name) === false) return;
        if (this.portMap[port.name] !== void 0) {
          this.warn(
            `Connection with "${port.name}" already exists. Disconnecting the previous one and connecting the new one.`
          );
          this.portMap[port.name].disconnect();
          __privateMethod(this, _BexBridge_instances, cleanupPort_fn).call(this, port.name);
        }
        this.portMap[port.name] = port;
        port.onMessage.addListener(onPacket);
        port.onDisconnect.addListener(() => {
          port.onMessage.removeListener(onPacket);
          __privateMethod(this, _BexBridge_instances, cleanupPort_fn).call(this, port.name);
          this.log(`Closed connection with ${port.name}.`);
          __privateMethod(this, _BexBridge_instances, onPortChange_fn).call(this, { removed: port.name });
        });
        this.log(`Opened connection with ${port.name}.`);
        __privateMethod(this, _BexBridge_instances, onPortChange_fn).call(this, { added: port.name });
      });
    }
    /**
     * @returns {Promise<void>}
     */
    connectToBackground() {
      if (__privateGet(this, _type) === "background") {
        return Promise.reject("The background script itself does not need to connect");
      }
      if (this.isConnected === true) {
        return Promise.reject("The bridge is already connected");
      }
      const portToBackground = runtime.connect({ name: this.portName });
      return new Promise((resolve, reject) => {
        const onPacket = (packet) => {
          if (this.isConnected === false) {
            this.isConnected = true;
            this.log("Connected to the background script.");
            this.portMap = { background: portToBackground };
            resolve();
          }
          __privateMethod(this, _BexBridge_instances, onPacket_fn).call(this, packet);
        };
        const onDisconnect = () => {
          if (runtime.lastError?.message?.indexOf("Could not establish connection") !== -1) {
            this.isConnected = false;
            portToBackground.onMessage.removeListener(onPacket);
            portToBackground.onMessage.removeListener(onDisconnect);
            reject("Could not connect to the background script.");
            return;
          }
          this.isConnected = false;
          for (const id in this.messageMap) {
            const item = this.messageMap[id];
            item.reject("Connection was closed");
          }
          this.portMap = {};
          this.portList = [];
          this.messageMap = {};
          this.chunkMap = {};
          this.log("Closed connection with the background script.");
        };
        portToBackground.onMessage.addListener(onPacket);
        portToBackground.onDisconnect.addListener(onDisconnect);
      });
    }
    /**
     * @returns {Promise<void>}
     */
    disconnectFromBackground() {
      if (__privateGet(this, _type) === "background") {
        return Promise.reject("Background script does not need to disconnect");
      }
      if (this.isConnected === false) {
        return Promise.reject("Tried to disconnect from the background script but the port was not connected");
      }
      this.portMap.background.disconnect();
      delete this.portMap.background;
      this.isConnected = false;
      return Promise.resolve();
    }
    /**
     * @param {string} event
     * @param {(message: Message) => void} callback
     */
    on(event, callback) {
      if (!event) {
        this.warn("Tried add listener but no event specified.");
        return;
      }
      if (typeof callback !== "function") {
        this.warn("Tried add listener but no valid callback function specified.");
        return;
      }
      const target = this.listeners[event] || (this.listeners[event] = []);
      target.push({ type: "on", callback });
      this.log(`Added a listener for event: "${event}".`);
    }
    /**
     * @param {string} event
     * @param {(message: Message) => void} callback
     */
    once(event, callback) {
      if (!event) {
        this.warn("Tried add listener but no event specified.");
        return;
      }
      if (typeof callback !== "function") {
        this.warn("Tried add listener but no valid callback function specified.");
        return;
      }
      const target = this.listeners[event] || (this.listeners[event] = []);
      target.push({ type: "once", callback });
      this.log(`Added a one-time listener for event: "${event}".`);
    }
    /**
     * @param {string} event
     * @param {(message: Message) => void} callback
     */
    off(event, callback) {
      if (!event) {
        this.warn("Tried to remove listeners but no event specified.");
        return;
      }
      const list = this.listeners[event];
      if (list === void 0) {
        this.warn(`Tried to remove listener for "${event}" event but there is no such listener attached.`);
        return;
      }
      if (callback === void 0) {
        if (event.startsWith("@quasar:")) {
          this.listeners[event] = [list[0]];
        } else {
          delete this.listeners[event];
        }
        this.log(`Stopped listening for "${event}".`);
        return;
      }
      if (typeof callback !== "function") {
        this.warn("Tried to remove listener but the callback specified is not a function.");
        return;
      }
      const liveEvents = list.filter((entry) => entry.callback !== callback);
      if (liveEvents.length !== 0) {
        this.listeners[event] = liveEvents;
        this.log(`Removed a listener for: "${event}".`);
      } else {
        delete this.listeners[event];
        this.log(`Stopped listening for: "${event}".`);
      }
    }
    /**
     * @param {{ event: string, to: string, payload: any } | undefined} param
     * @returns {Promise<any>} response payload
     */
    async send({ event, to, payload } = {}) {
      if (this.isConnected === false) {
        throw new Error("Tried to send message but the bridge is not connected. Please connect it first.");
      }
      if (!event) {
        throw new Error('Tried to send message with no "event" prop specified');
      }
      if (!to) {
        throw new Error('Tried to send message with no "to" prop specified');
      }
      if (this.portList.includes(to) === false) {
        throw new Error(
          __privateGet(this, _type) === "background" ? `Tried to send message to "${to}" but there is no such port registered` : `Tried to send message to "${to}" but the port to background is not available to send through`
        );
      }
      const id = getRandomId(1e6);
      await __privateMethod(this, _BexBridge_instances, sendMessage_fn).call(this, {
        id,
        to,
        payload,
        messageType: "event-send",
        messageProps: { event }
      });
      if (this.portList.includes(to) === false) {
        throw new Error(`Connection to "${to}" was closed while waiting for a response`);
      }
      return new Promise((resolve, reject) => {
        this.messageMap[id] = {
          portName: to,
          resolve: (responsePayload) => {
            delete this.messageMap[id];
            resolve(responsePayload);
          },
          reject: (err) => {
            delete this.messageMap[id];
            reject(err);
          }
        };
      });
    }
    /**
     * @param {boolean} value
     */
    setDebug(value) {
      __privateSet(this, _debug, value === true);
    }
    log(...args) {
      if (__privateGet(this, _debug) !== true || args.length === 0) return;
      const lastArg = args[args.length - 1];
      if (lastArg !== void 0 && Object(lastArg) === lastArg) {
        const log = `${__privateGet(this, _banner)} ${args.slice(0, -1).join(" ")} (click to expand)`;
        console.groupCollapsed(log);
        console.dir(lastArg);
        console.groupEnd(log);
      } else {
        console.log(__privateGet(this, _banner), ...args);
      }
    }
    warn(...args) {
      if (args.length === 0) return;
      const lastArg = args[args.length - 1];
      if (lastArg !== void 0 && Object(lastArg) === lastArg) {
        console.warn(__privateGet(this, _banner), ...args.slice(0, -1));
        const group = "The above warning details (click to expand)";
        console.groupCollapsed(group);
        console.dir(lastArg);
        console.groupEnd(group);
      } else {
        console.warn(__privateGet(this, _banner), ...args);
      }
    }
  };
  _type = new WeakMap();
  _debug = new WeakMap();
  _banner = new WeakMap();
  _BexBridge_instances = new WeakSet();
  /**
   * Should be used only by the background script
   * @param {{ added?: string } | { removed?: string }} reason
   */
  onPortChange_fn = function(reason) {
    this.portList = Object.keys(this.portMap);
    const list = ["background", ...this.portList];
    for (const portName of this.portList) {
      this.send({
        event: "@quasar:ports",
        to: portName,
        payload: {
          portList: list.filter((name) => name !== portName),
          ...reason
        }
      }).catch((err) => {
        this.warn(
          `Failed to inform "${portName}" about the port list.`,
          err
        );
      });
    }
  };
  triggerMessageEvent_fn = async function(message) {
    const list = this.listeners[message.event];
    if (list === void 0) return;
    const plural = list.length > 1 ? "s" : "";
    this.log(
      `Triggering ${list.length} listener${plural} for event: "${message.event}".`,
      { message, listeners: list }
    );
    let responsePayload;
    for (const { type, callback } of list.slice(0)) {
      if (type === "once") {
        this.off(message.event, callback);
      }
      try {
        if (responsePayload === void 0) {
          const value = callback(message);
          responsePayload = value instanceof Promise ? await value : value;
        } else {
          callback(message);
        }
      } catch (err) {
        this.warn(
          `Error while triggering listener${plural} for event: "${message.event}".`,
          { error: err, message, listener: { type, callback } }
        );
        return Promise.reject(err);
      }
    }
    return responsePayload;
  };
  /**
   * @param {string} portName
   */
  cleanupPort_fn = function(portName) {
    for (const id in this.chunkMap) {
      const packet = this.chunkMap[id];
      if (packet.portName === portName) {
        delete this.chunkMap[id];
      }
    }
    for (const id in this.messageMap) {
      const packet = this.messageMap[id];
      if (packet.portName === portName) {
        packet.reject("Connection was closed");
      }
    }
    delete this.portMap[portName];
  };
  onPacket_fn = function(packet) {
    if (Object(packet) !== packet || packet.id === void 0 || packet.from === void 0 || packet.to === void 0 || packet.type === void 0) {
      this.log(
        "Received a message that does not appear to be emitted by a Quasar bridge or is malformed.",
        packet
      );
      return;
    }
    this.log(
      `Received message of type "${packet.type}" from "${packet.from}".`,
      packet
    );
    if (packet.to !== this.portName) {
      __privateMethod(this, _BexBridge_instances, sendPacket_fn).call(this, packet).catch((err) => {
        this.warn(
          `Failed to forward message of type "${packet.type}" from "${packet.from}" to "${packet.to}".`,
          err
        );
        __privateMethod(this, _BexBridge_instances, sendMessage_fn).call(this, {
          id: packet.id,
          to: packet.from,
          messageType: "event-response",
          messageProps: {
            error: {
              message: err.message,
              stack: err.stack || "no stack available"
            },
            quiet: true
          }
        });
      });
      return;
    }
    if (packet.type === "full") {
      __privateMethod(this, _BexBridge_instances, onMessage_fn).call(this, {
        id: packet.id,
        from: packet.from,
        to: packet.to,
        payload: packet.payload,
        type: packet.messageType,
        props: packet.messageProps
      });
      return;
    }
    if (packet.type === "chunk") {
      const chunk = this.chunkMap[packet.id];
      if (chunk === void 0) {
        if (packet.chunkIndex !== void 0) {
          this.warn(
            "Received an unregistered chunk.",
            packet
          );
          return;
        }
        this.chunkMap[packet.id] = {
          portName: packet.from,
          number: packet.chunksNumber,
          messageType: packet.messageType,
          messageProps: packet.messageProps,
          payload: []
        };
        return;
      }
      if (packet.chunkIndex !== chunk.payload.length) {
        this.warn(
          "Received an out of order chunk.",
          packet
        );
        delete this.chunkMap[packet.id];
        return;
      }
      chunk.payload.push(packet.payload);
      if (packet.chunkIndex === chunk.number - 1) {
        delete this.chunkMap[packet.id];
        __privateMethod(this, _BexBridge_instances, onMessage_fn).call(this, {
          id: packet.id,
          from: packet.from,
          to: packet.to,
          payload: chunk.payload,
          type: chunk.messageType,
          props: chunk.messageProps
        });
      }
      return;
    }
    if (packet.type === "chunk-abort") {
      delete this.chunkMap[packet.id];
      return;
    }
    this.warn(
      `Received an unknown message type: "${packet.type}".`
    );
  };
  sendPacket_fn = function(packet) {
    this.log(
      packet.from === this.portName ? `Sending message of type "${packet.type}" to "${packet.to}".` : `Forwarding message of type "${packet.type}" from "${packet.from}" to "${packet.to}".`,
      packet
    );
    const port = __privateGet(this, _type) === "background" ? this.portMap[packet.to] : this.portMap.background;
    if (this.portList.includes(packet.to) === false) {
      return Promise.reject(
        `Tried to send message of type "${packet.type}" to "${packet.to}" but there is no such port registered`
      );
    }
    if (port === void 0) {
      return Promise.reject(
        __privateGet(this, _type) === "background" ? `Tried to send message of type "${packet.type}" to "${packet.to}" but the port is not available` : `Tried to send message of type "${packet.type}" to "${packet.to}" but the port to background is not available to forward through`
      );
    }
    try {
      port.postMessage(packet);
    } catch (err) {
      this.warn(
        `Failed to send message to "${packet.to}".`,
        err
      );
      return Promise.reject(err);
    }
    return Promise.resolve();
  };
  /**
   * @param {{ id?: number, to: string, payload: any, messageType: "event-send" | "event-response", messageProps: any }} param
   */
  sendMessage_fn = function({
    id = getRandomId(1e6),
    to,
    payload,
    messageType,
    messageProps
  }) {
    if (Array.isArray(payload) === false) {
      return __privateMethod(this, _BexBridge_instances, sendPacket_fn).call(this, {
        id,
        from: this.portName,
        to,
        type: "full",
        payload,
        messageType,
        messageProps
      });
    }
    let promise = __privateMethod(this, _BexBridge_instances, sendPacket_fn).call(this, {
      id,
      from: this.portName,
      to,
      type: "chunk",
      chunksNumber: payload.length,
      messageType,
      messageProps
    });
    for (let i = 0; i < payload.length; i++) {
      promise = promise.then(() => __privateMethod(this, _BexBridge_instances, sendPacket_fn).call(this, {
        id,
        from: this.portName,
        to,
        type: "chunk",
        payload: payload[i],
        chunkIndex: i
      }));
    }
    return promise.catch((err) => {
      __privateMethod(this, _BexBridge_instances, sendPacket_fn).call(this, {
        id,
        from: this.portName,
        to,
        type: "chunk-abort"
      }).catch((err2) => {
        this.warn(
          `Failed to send a chunk-abort message to "${to}".`,
          err2
        );
      });
      return Promise.reject(err);
    });
  };
  onMessage_fn = function(message) {
    if (message.type === "event-response") {
      const target = this.messageMap[message.id];
      if (target === void 0) {
        if (message.props.quiet !== true) {
          this.warn(
            `Received a response for an unknown message id: "${message.id}".`,
            message
          );
        }
        return;
      }
      if (message.props.error !== void 0) {
        target.reject(message.props.error);
      } else {
        target.resolve(message.payload);
      }
      return;
    }
    if (message.type === "event-send") {
      __privateMethod(this, _BexBridge_instances, triggerMessageEvent_fn).call(this, {
        from: message.from,
        to: message.to,
        event: message.props.event,
        payload: message.payload
      }).then((returnPayload) => {
        __privateMethod(this, _BexBridge_instances, sendMessage_fn).call(this, {
          id: message.id,
          to: message.from,
          payload: returnPayload,
          messageType: "event-response",
          messageProps: {}
        });
      }).catch((err) => {
        __privateMethod(this, _BexBridge_instances, sendMessage_fn).call(this, {
          id: message.id,
          to: message.from,
          messageType: "event-response",
          messageProps: {
            error: {
              message: err.message,
              stack: err.stack || "no stack available"
            }
          }
        });
      });
      return;
    }
    this.warn(
      `Received a message with unknown type: "${message.type}".`,
      message
    );
  };

  // node_modules/@quasar/app-vite/exports/bex/background.js
  if (false) {
    const devServerPort = process.env.__QUASAR_BEX_SERVER_PORT__;
    const wsToken = process.env.__QUASAR_BEX_WS_TOKEN__;
    interceptRequests(devServerPort);
    connectToDevServer(devServerPort, wsToken);
  }
  var scriptHasBridge = false;
  function createBridge({ debug } = {}) {
    if (scriptHasBridge === true) {
      console.error("Background Quasar Bridge has already been created.");
      return;
    }
    scriptHasBridge = true;
    return new BexBridge({
      type: "background",
      debug
    });
  }

  // src-bex/background.js
  chrome.action.onClicked.addListener(async (tab) => {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  });
  chrome.sidePanel.setOptions({
    path: "www/index.html",
    enabled: true
  });
  var bridge = createBridge({ debug: false });
  bridge.on("log", ({ from, payload }) => {
    console.log(`[BEX] @log from "${from}"`, payload);
  });
  bridge.on("getTime", () => {
    return Date.now();
  });
  bridge.on("storage.get", ({ payload }) => {
    return new Promise((resolve) => {
      if (payload === void 0) {
        chrome.storage.local.get(null, (items) => {
          resolve(Object.values(items));
        });
      } else {
        chrome.storage.local.get([payload], (items) => {
          resolve(items[payload]);
        });
      }
    });
  });
  bridge.on("storage.set", async ({ payload }) => {
    await chrome.storage.local.set({ [payload.key]: payload.value });
  });
  bridge.on("storage.remove", async ({ payload }) => {
    await chrome.storage.local.remove(payload);
  });
  bridge.on("setLocation", async ({ payload }) => {
    console.log("[BEX] setLocation received", payload);
    console.log("[BEX] port list", bridge.portList);
    for (const portName of bridge.portList) {
      if (portName.startsWith("content@")) {
        console.log("[BEX] send payload to bride port", portName);
        bridge.send({
          event: "test",
          to: portName,
          payload: { selected: payload }
        });
      }
    }
    return { success: true };
  });
})();
