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

  // node_modules/@quasar/app-vite/exports/bex/content.js
  if (true) {
    let scriptIsReloading = false;
    const scriptName = "inject-hook";
    const portName = `quasar@hmr/content-script/${scriptName}`;
    const banner = `[QBex|HMR] [${scriptName}]`;
    const onMessage = (message) => {
      if (message === "qbex:hmr:hello") {
        console.log(`${banner} Connected to background`);
        return;
      }
      if (message === "qbex:hmr:reload-content") {
        console.log(`${banner} Reload requested by background...`);
        scriptIsReloading = true;
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };
    const connect = () => {
      const port = chrome.runtime.connect({ name: portName });
      port.onMessage.addListener(onMessage);
      port.onDisconnect.addListener(() => {
        if (scriptIsReloading === true) return;
        port.onMessage.removeListener(onMessage);
        console.log(
          chrome.runtime.lastError?.message?.indexOf("Could not establish connection") !== -1 ? `${banner} Could not connect to background` : `${banner} Lost connection to background`
        );
        setTimeout(connect, 1e3);
      });
    };
    connect();
  }
  var scriptHasBridge = false;
  function createBridge({ debug } = {}) {
    if (scriptHasBridge === true) {
      console.error("Content script Quasar Bridge has already been created.");
      return;
    }
    scriptHasBridge = true;
    return new BexBridge({
      type: "content",
      name: "inject-hook",
      debug
    });
  }

  // src-bex/inject-hook.js
  var fake = {
    coords: {
      accuracy: 11,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      latitude: 11.111111,
      longitude: 22.22222,
      magic: "g was here"
    },
    timestamp: 99999999
  };
  var mapFake = function(selected) {
    fake.coords.latitude = selected.lat;
    fake.coords.longitude = selected.lng;
    fake.timestamp = (/* @__PURE__ */ new Date()).getTime();
    return fake;
  };
  function doMagic(fake2) {
    console.log("[hook] doMagic", fake2);
    setTimeout(() => {
      console.log("[hook] sending post message to inject", fake2);
      window.postMessage({ type: "gps.set", fake: fake2 }, "*");
    }, 50);
  }
  function initCall() {
    let key = "_gps_selected";
    chrome.storage.local.get([key], (r) => {
      console.log("[hook] storage.get initial", r[key]);
      if (r[key]) {
        let newFake = mapFake(r[key]);
        if (newFake.coords.latitude) {
          console.log("[hook] Found saved storage location, running injction");
          doMagic(newFake);
        }
      }
    });
  }
  initCall();
  var bridge = createBridge({ debug: false });
  bridge.connectToBackground().then(() => {
    console.log("[hook] Connected to background");
  }).catch((err) => {
    console.error("[hook] Failed to connect to background:", err);
  });
  bridge.on("test", async ({ payload }) => {
    console.log("[hook] event received", payload, mapFake(payload.selected));
    doMagic(mapFake(payload.selected));
    return { success: true };
  });
  bridge.on("contentScriptReady", ({ from }) => {
    console.log("[hook] Content script ready:", from);
  });
  console.log("[hook] inject-hook loaded");
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vbm9kZV9tb2R1bGVzL0BxdWFzYXIvYXBwLXZpdGUvZXhwb3J0cy9iZXgvcHJpdmF0ZS9iZXgtYnJpZGdlLmpzIiwgIi4uLy4uL25vZGVfbW9kdWxlcy9AcXVhc2FyL2FwcC12aXRlL2V4cG9ydHMvYmV4L2NvbnRlbnQuanMiLCAiLi4vLi4vc3JjLWJleC9pbmplY3QtaG9vay5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgcG9ydE5hbWVSRSA9IC9eYmFja2dyb3VuZCR8XmFwcCR8XmNvbnRlbnRAL1xuY29uc3QgeyBydW50aW1lIH0gPSBwcm9jZXNzLmVudi5UQVJHRVQgPT09ICdmaXJlZm94JyA/IGJyb3dzZXIgOiBjaHJvbWVcblxuLyoqXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4XG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiBnZXRSYW5kb21JZCAobWF4KSB7XG4gIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXgpXG59XG5cbi8qKlxuICogQHR5cGVkZWYgTWVzc2FnZVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGZyb21cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0b1xuICogQHByb3BlcnR5IHtzdHJpbmd9IGV2ZW50XG4gKiBAcHJvcGVydHkge2FueX0gcGF5bG9hZFxuICovXG5cbmV4cG9ydCBjbGFzcyBCZXhCcmlkZ2Uge1xuICAvLyBQdWJsaWMgcHJvcGVydGllc1xuICAvKiogQHR5cGUge3N0cmluZ30gKi9cbiAgcG9ydE5hbWUgPSBudWxsXG4gIC8qKiBAdHlwZSB7Ym9vbGVhbn0gKi9cbiAgaXNDb25uZWN0ZWQgPSBmYWxzZVxuICAvKiogQHR5cGUge3sgdHlwZTogJ29uJyB8ICdvbmNlJywgY2FsbGJhY2s6IChtZXNzYWdlOiBNZXNzYWdlKSA9PiB2b2lkIH1bXX0gKi9cbiAgbGlzdGVuZXJzID0ge31cbiAgLyoqIEB0eXBlIHt7IFtwb3J0TmFtZTogc3RyaW5nXTogY2hyb21lLnJ1bnRpbWUuUG9ydCB9fSAqL1xuICBwb3J0TWFwID0ge31cbiAgLyoqIEB0eXBlIHtzdHJpbmdbXX0gKi9cbiAgcG9ydExpc3QgPSBbXVxuICAvKiogQHR5cGUge3sgW2lkOiBzdHJpbmddOiB7IHBvcnROYW1lOiBzdHJpbmcsIHJlc29sdmU6IChwYXlsb2FkOiBhbnkpID0+IHZvaWQsIHJlamVjdDogKGVycjogYW55KSA9PiB2b2lkIH0gfX0gKi9cbiAgbWVzc2FnZU1hcCA9IHt9XG4gIC8qKiBAdHlwZSB7eyBbaWQ6IHN0cmluZ106IHsgcG9ydE5hbWU6IHN0cmluZywgbnVtYmVyOiBudW1iZXIsIG1lc3NhZ2VUeXBlOiBzdHJpbmcsIG1lc3NhZ2VQcm9wczogYW55LCBwYXlsb2FkOiBhbnlbXSB9IH19ICovXG4gIGNodW5rTWFwID0ge31cblxuICAvLyBQcml2YXRlIHByb3BlcnRpZXNcbiAgLyoqIEB0eXBlIHsnYmFja2dyb3VuZCcgfCAnY29udGVudCcgfCAnYXBwJ30gKi9cbiAgI3R5cGVcbiAgLyoqIEB0eXBlIHtib29sZWFufSAqL1xuICAjZGVidWcgPSBmYWxzZVxuICAvKiogQHR5cGUge3N0cmluZ30gKi9cbiAgI2Jhbm5lclxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3sgdHlwZTogJ2JhY2tncm91bmQnIHwgJ2NvbnRlbnQnIHwgJ2FwcCcsIG5hbWU/OiBzdHJpbmcsIGRlYnVnPzogYm9vbGVhbiB9fSBvcHRpb25zXG4gICAqL1xuICBjb25zdHJ1Y3RvciAoeyB0eXBlLCBuYW1lID0gJycsIGRlYnVnIH0pIHtcbiAgICB0aGlzLnBvcnROYW1lID0gdHlwZVxuICAgIHRoaXMuI3R5cGUgPSB0eXBlXG5cbiAgICBpZiAodHlwZSA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICAvKipcbiAgICAgICAqIFRoZXJlIGNhbiBiZSBtdWx0aXBsZSBpbnN0YW5jZXMgb2YgdGhlIHNhbWUgY29udGVudCBzY3JpcHRcbiAgICAgICAqIGJ1dCBmb3IgZGlmZmVyZW50IHRhYnMsIHNvIHdlIG5lZWQgdG8gZGlmZmVyZW50aWF0ZSB0aGVtLlxuICAgICAgICpcbiAgICAgICAqIEdlbmVyYXRpbmcgYW4gZWFzeSB0byBoYW5kbGUgaWQgZm9yIHRoZSBjb250ZW50IHNjcmlwdC5cbiAgICAgICAqL1xuICAgICAgdGhpcy5wb3J0TmFtZSA9IGAkeyB0eXBlIH1AJHsgbmFtZSB9LSR7IGdldFJhbmRvbUlkKDEwXzAwMCkgfWBcbiAgICB9XG5cbiAgICB0aGlzLiNiYW5uZXIgPSBgW1FCZXh8JHsgdGhpcy5wb3J0TmFtZSB9XWBcbiAgICB0aGlzLiNkZWJ1ZyA9IGRlYnVnID09PSB0cnVlXG5cbiAgICBpZiAodHlwZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgICB0aGlzLm9uKCdAcXVhc2FyOnBvcnRzJywgKHsgcGF5bG9hZCB9KSA9PiB7XG4gICAgICAgIHRoaXMucG9ydExpc3QgPSBwYXlsb2FkLnBvcnRMaXN0XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW92ZWQgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMuI2NsZWFudXBQb3J0KHBheWxvYWQucmVtb3ZlZClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRWxzZSB3ZSdyZSB0aGUgYmFja2dyb3VuZCBzY3JpcHRcbiAgICAgKi9cblxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXG4gICAgY29uc3Qgb25QYWNrZXQgPSB0aGlzLiNvblBhY2tldC5iaW5kKHRoaXMpXG5cbiAgICBydW50aW1lLm9uQ29ubmVjdC5hZGRMaXN0ZW5lcihwb3J0ID0+IHtcbiAgICAgIC8vIGlmIGl0J3Mgbm90IGEgYnJpZGdlIHBvcnQgb24gdGhlIG90aGVyIGVuZCxcbiAgICAgIC8vIHRoZW4gaWdub3JlIGl0XG4gICAgICBpZiAocG9ydE5hbWVSRS50ZXN0KHBvcnQubmFtZSkgPT09IGZhbHNlKSByZXR1cm5cblxuICAgICAgaWYgKHRoaXMucG9ydE1hcFsgcG9ydC5uYW1lIF0gIT09IHZvaWQgMCkge1xuICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgYENvbm5lY3Rpb24gd2l0aCBcIiR7IHBvcnQubmFtZSB9XCIgYWxyZWFkeSBleGlzdHMuYFxuICAgICAgICAgICsgJyBEaXNjb25uZWN0aW5nIHRoZSBwcmV2aW91cyBvbmUgYW5kIGNvbm5lY3RpbmcgdGhlIG5ldyBvbmUuJ1xuICAgICAgICApXG4gICAgICAgIHRoaXMucG9ydE1hcFsgcG9ydC5uYW1lIF0uZGlzY29ubmVjdCgpXG4gICAgICAgIHRoaXMuI2NsZWFudXBQb3J0KHBvcnQubmFtZSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5wb3J0TWFwWyBwb3J0Lm5hbWUgXSA9IHBvcnRcblxuICAgICAgcG9ydC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIob25QYWNrZXQpXG4gICAgICBwb3J0Lm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICAgIHBvcnQub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKG9uUGFja2V0KVxuICAgICAgICB0aGlzLiNjbGVhbnVwUG9ydChwb3J0Lm5hbWUpXG4gICAgICAgIHRoaXMubG9nKGBDbG9zZWQgY29ubmVjdGlvbiB3aXRoICR7IHBvcnQubmFtZSB9LmApXG4gICAgICAgIHRoaXMuI29uUG9ydENoYW5nZSh7IHJlbW92ZWQ6IHBvcnQubmFtZSB9KVxuICAgICAgfSlcblxuICAgICAgdGhpcy5sb2coYE9wZW5lZCBjb25uZWN0aW9uIHdpdGggJHsgcG9ydC5uYW1lIH0uYClcbiAgICAgIHRoaXMuI29uUG9ydENoYW5nZSh7IGFkZGVkOiBwb3J0Lm5hbWUgfSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxuICAgKi9cbiAgY29ubmVjdFRvQmFja2dyb3VuZCAoKSB7XG4gICAgaWYgKHRoaXMuI3R5cGUgPT09ICdiYWNrZ3JvdW5kJykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdUaGUgYmFja2dyb3VuZCBzY3JpcHQgaXRzZWxmIGRvZXMgbm90IG5lZWQgdG8gY29ubmVjdCcpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnVGhlIGJyaWRnZSBpcyBhbHJlYWR5IGNvbm5lY3RlZCcpXG4gICAgfVxuXG4gICAgY29uc3QgcG9ydFRvQmFja2dyb3VuZCA9IHJ1bnRpbWUuY29ubmVjdCh7IG5hbWU6IHRoaXMucG9ydE5hbWUgfSlcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBvblBhY2tldCA9IHBhY2tldCA9PiB7XG4gICAgICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkID09PSBmYWxzZSkge1xuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIFdlIHJlbHkgb24gdGhlIGZhY3QgdGhhdCB1cG9uIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAgICAgICAgKiB0aGUgYmFja2dyb3VuZCBzY3JpcHQgd2lsbCBzZW5kIGEgQHF1YXNhcjpwb3J0cyBldmVudFxuICAgICAgICAgICAqL1xuICAgICAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXG4gICAgICAgICAgdGhpcy5sb2coJ0Nvbm5lY3RlZCB0byB0aGUgYmFja2dyb3VuZCBzY3JpcHQuJylcbiAgICAgICAgICB0aGlzLnBvcnRNYXAgPSB7IGJhY2tncm91bmQ6IHBvcnRUb0JhY2tncm91bmQgfVxuICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy4jb25QYWNrZXQocGFja2V0KVxuICAgICAgfVxuXG4gICAgICBjb25zdCBvbkRpc2Nvbm5lY3QgPSAoKSA9PiB7XG4gICAgICAgIGlmIChydW50aW1lLmxhc3RFcnJvcj8ubWVzc2FnZT8uaW5kZXhPZignQ291bGQgbm90IGVzdGFibGlzaCBjb25uZWN0aW9uJykgIT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG4gICAgICAgICAgcG9ydFRvQmFja2dyb3VuZC5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIob25QYWNrZXQpXG4gICAgICAgICAgcG9ydFRvQmFja2dyb3VuZC5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIob25EaXNjb25uZWN0KVxuICAgICAgICAgIHJlamVjdCgnQ291bGQgbm90IGNvbm5lY3QgdG8gdGhlIGJhY2tncm91bmQgc2NyaXB0LicpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2VcblxuICAgICAgICBmb3IgKGNvbnN0IGlkIGluIHRoaXMubWVzc2FnZU1hcCkge1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm1lc3NhZ2VNYXBbIGlkIF1cbiAgICAgICAgICBpdGVtLnJlamVjdCgnQ29ubmVjdGlvbiB3YXMgY2xvc2VkJylcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucG9ydE1hcCA9IHt9XG4gICAgICAgIHRoaXMucG9ydExpc3QgPSBbXVxuICAgICAgICB0aGlzLm1lc3NhZ2VNYXAgPSB7fVxuICAgICAgICB0aGlzLmNodW5rTWFwID0ge31cblxuICAgICAgICB0aGlzLmxvZygnQ2xvc2VkIGNvbm5lY3Rpb24gd2l0aCB0aGUgYmFja2dyb3VuZCBzY3JpcHQuJylcbiAgICAgIH1cblxuICAgICAgcG9ydFRvQmFja2dyb3VuZC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIob25QYWNrZXQpXG4gICAgICBwb3J0VG9CYWNrZ3JvdW5kLm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcihvbkRpc2Nvbm5lY3QpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cbiAgICovXG4gIGRpc2Nvbm5lY3RGcm9tQmFja2dyb3VuZCAoKSB7XG4gICAgaWYgKHRoaXMuI3R5cGUgPT09ICdiYWNrZ3JvdW5kJykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdCYWNrZ3JvdW5kIHNjcmlwdCBkb2VzIG5vdCBuZWVkIHRvIGRpc2Nvbm5lY3QnKVxuICAgIH1cblxuICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdUcmllZCB0byBkaXNjb25uZWN0IGZyb20gdGhlIGJhY2tncm91bmQgc2NyaXB0IGJ1dCB0aGUgcG9ydCB3YXMgbm90IGNvbm5lY3RlZCcpXG4gICAgfVxuXG4gICAgdGhpcy5wb3J0TWFwLmJhY2tncm91bmQuZGlzY29ubmVjdCgpXG4gICAgZGVsZXRlIHRoaXMucG9ydE1hcC5iYWNrZ3JvdW5kXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50XG4gICAqIEBwYXJhbSB7KG1lc3NhZ2U6IE1lc3NhZ2UpID0+IHZvaWR9IGNhbGxiYWNrXG4gICAqL1xuICBvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFldmVudCkge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCBhZGQgbGlzdGVuZXIgYnV0IG5vIGV2ZW50IHNwZWNpZmllZC4nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCBhZGQgbGlzdGVuZXIgYnV0IG5vIHZhbGlkIGNhbGxiYWNrIGZ1bmN0aW9uIHNwZWNpZmllZC4nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5saXN0ZW5lcnNbIGV2ZW50IF0gfHwgKHRoaXMubGlzdGVuZXJzWyBldmVudCBdID0gW10pXG4gICAgdGFyZ2V0LnB1c2goeyB0eXBlOiAnb24nLCBjYWxsYmFjayB9KVxuICAgIHRoaXMubG9nKGBBZGRlZCBhIGxpc3RlbmVyIGZvciBldmVudDogXCIkeyBldmVudCB9XCIuYClcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRcbiAgICogQHBhcmFtIHsobWVzc2FnZTogTWVzc2FnZSkgPT4gdm9pZH0gY2FsbGJhY2tcbiAgICovXG4gIG9uY2UgKGV2ZW50LCBjYWxsYmFjaykge1xuICAgIGlmICghZXZlbnQpIHtcbiAgICAgIHRoaXMud2FybignVHJpZWQgYWRkIGxpc3RlbmVyIGJ1dCBubyBldmVudCBzcGVjaWZpZWQuJylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMud2FybignVHJpZWQgYWRkIGxpc3RlbmVyIGJ1dCBubyB2YWxpZCBjYWxsYmFjayBmdW5jdGlvbiBzcGVjaWZpZWQuJylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubGlzdGVuZXJzWyBldmVudCBdIHx8ICh0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXSA9IFtdKVxuICAgIHRhcmdldC5wdXNoKHsgdHlwZTogJ29uY2UnLCBjYWxsYmFjayB9KVxuICAgIHRoaXMubG9nKGBBZGRlZCBhIG9uZS10aW1lIGxpc3RlbmVyIGZvciBldmVudDogXCIkeyBldmVudCB9XCIuYClcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRcbiAgICogQHBhcmFtIHsobWVzc2FnZTogTWVzc2FnZSkgPT4gdm9pZH0gY2FsbGJhY2tcbiAgICovXG4gIG9mZiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFldmVudCkge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCB0byByZW1vdmUgbGlzdGVuZXJzIGJ1dCBubyBldmVudCBzcGVjaWZpZWQuJylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IGxpc3QgPSB0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXVxuXG4gICAgaWYgKGxpc3QgPT09IHZvaWQgMCkge1xuICAgICAgdGhpcy53YXJuKGBUcmllZCB0byByZW1vdmUgbGlzdGVuZXIgZm9yIFwiJHsgZXZlbnQgfVwiIGV2ZW50IGJ1dCB0aGVyZSBpcyBubyBzdWNoIGxpc3RlbmVyIGF0dGFjaGVkLmApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2sgPT09IHZvaWQgMCkge1xuICAgICAgaWYgKGV2ZW50LnN0YXJ0c1dpdGgoJ0BxdWFzYXI6JykpIHtcbiAgICAgICAgLy8gZW5zdXJlIHdlIGRvbid0IHJlbW92ZSBpbnRlcm5hbCBsaXN0ZW5lcnNcbiAgICAgICAgdGhpcy5saXN0ZW5lcnNbIGV2ZW50IF0gPSBbIGxpc3RbIDAgXSBdXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMubGlzdGVuZXJzWyBldmVudCBdXG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9nKGBTdG9wcGVkIGxpc3RlbmluZyBmb3IgXCIkeyBldmVudCB9XCIuYClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMud2FybignVHJpZWQgdG8gcmVtb3ZlIGxpc3RlbmVyIGJ1dCB0aGUgY2FsbGJhY2sgc3BlY2lmaWVkIGlzIG5vdCBhIGZ1bmN0aW9uLicpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBsaXZlRXZlbnRzID0gbGlzdC5maWx0ZXIoZW50cnkgPT4gZW50cnkuY2FsbGJhY2sgIT09IGNhbGxiYWNrKVxuXG4gICAgaWYgKGxpdmVFdmVudHMubGVuZ3RoICE9PSAwKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXSA9IGxpdmVFdmVudHNcbiAgICAgIHRoaXMubG9nKGBSZW1vdmVkIGEgbGlzdGVuZXIgZm9yOiBcIiR7IGV2ZW50IH1cIi5gKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXVxuICAgICAgdGhpcy5sb2coYFN0b3BwZWQgbGlzdGVuaW5nIGZvcjogXCIkeyBldmVudCB9XCIuYClcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHt7IGV2ZW50OiBzdHJpbmcsIHRvOiBzdHJpbmcsIHBheWxvYWQ6IGFueSB9IHwgdW5kZWZpbmVkfSBwYXJhbVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxhbnk+fSByZXNwb25zZSBwYXlsb2FkXG4gICAqL1xuICBhc3luYyBzZW5kICh7IGV2ZW50LCB0bywgcGF5bG9hZCB9ID0ge30pIHtcbiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gc2VuZCBtZXNzYWdlIGJ1dCB0aGUgYnJpZGdlIGlzIG5vdCBjb25uZWN0ZWQuIFBsZWFzZSBjb25uZWN0IGl0IGZpcnN0LicpXG4gICAgfVxuXG4gICAgaWYgKCFldmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBzZW5kIG1lc3NhZ2Ugd2l0aCBubyBcImV2ZW50XCIgcHJvcCBzcGVjaWZpZWQnKVxuICAgIH1cblxuICAgIGlmICghdG8pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gc2VuZCBtZXNzYWdlIHdpdGggbm8gXCJ0b1wiIHByb3Agc3BlY2lmaWVkJylcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wb3J0TGlzdC5pbmNsdWRlcyh0bykgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIHRoaXMuI3R5cGUgPT09ICdiYWNrZ3JvdW5kJ1xuICAgICAgICAgID8gYFRyaWVkIHRvIHNlbmQgbWVzc2FnZSB0byBcIiR7IHRvIH1cIiBidXQgdGhlcmUgaXMgbm8gc3VjaCBwb3J0IHJlZ2lzdGVyZWRgXG4gICAgICAgICAgOiBgVHJpZWQgdG8gc2VuZCBtZXNzYWdlIHRvIFwiJHsgdG8gfVwiIGJ1dCB0aGUgcG9ydCB0byBiYWNrZ3JvdW5kIGlzIG5vdCBhdmFpbGFibGUgdG8gc2VuZCB0aHJvdWdoYFxuICAgICAgKVxuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZ2V0UmFuZG9tSWQoMV8wMDBfMDAwKVxuXG4gICAgYXdhaXQgdGhpcy4jc2VuZE1lc3NhZ2Uoe1xuICAgICAgaWQsXG4gICAgICB0byxcbiAgICAgIHBheWxvYWQsXG4gICAgICBtZXNzYWdlVHlwZTogJ2V2ZW50LXNlbmQnLFxuICAgICAgbWVzc2FnZVByb3BzOiB7IGV2ZW50IH1cbiAgICB9KVxuXG4gICAgaWYgKHRoaXMucG9ydExpc3QuaW5jbHVkZXModG8pID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25uZWN0aW9uIHRvIFwiJHsgdG8gfVwiIHdhcyBjbG9zZWQgd2hpbGUgd2FpdGluZyBmb3IgYSByZXNwb25zZWApXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMubWVzc2FnZU1hcFsgaWQgXSA9IHtcbiAgICAgICAgcG9ydE5hbWU6IHRvLFxuICAgICAgICByZXNvbHZlOiByZXNwb25zZVBheWxvYWQgPT4ge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VNYXBbIGlkIF1cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlUGF5bG9hZClcbiAgICAgICAgfSxcbiAgICAgICAgcmVqZWN0OiBlcnIgPT4ge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lc3NhZ2VNYXBbIGlkIF1cbiAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlXG4gICAqL1xuICBzZXREZWJ1ZyAodmFsdWUpIHtcbiAgICB0aGlzLiNkZWJ1ZyA9IHZhbHVlID09PSB0cnVlXG4gIH1cblxuICBsb2cgKC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy4jZGVidWcgIT09IHRydWUgfHwgYXJncy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3NbIGFyZ3MubGVuZ3RoIC0gMSBdXG5cbiAgICBpZiAobGFzdEFyZyAhPT0gdm9pZCAwICYmIE9iamVjdChsYXN0QXJnKSA9PT0gbGFzdEFyZykge1xuICAgICAgY29uc3QgbG9nID0gYCR7IHRoaXMuI2Jhbm5lciB9ICR7IGFyZ3Muc2xpY2UoMCwgLTEpLmpvaW4oJyAnKSB9IChjbGljayB0byBleHBhbmQpYFxuICAgICAgY29uc29sZS5ncm91cENvbGxhcHNlZChsb2cpXG4gICAgICBjb25zb2xlLmRpcihsYXN0QXJnKVxuICAgICAgY29uc29sZS5ncm91cEVuZChsb2cpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29uc29sZS5sb2codGhpcy4jYmFubmVyLCAuLi5hcmdzKVxuICAgIH1cbiAgfVxuXG4gIHdhcm4gKC4uLmFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3NbIGFyZ3MubGVuZ3RoIC0gMSBdXG5cbiAgICBpZiAobGFzdEFyZyAhPT0gdm9pZCAwICYmIE9iamVjdChsYXN0QXJnKSA9PT0gbGFzdEFyZykge1xuICAgICAgY29uc29sZS53YXJuKHRoaXMuI2Jhbm5lciwgLi4uYXJncy5zbGljZSgwLCAtMSkpXG4gICAgICBjb25zdCBncm91cCA9ICdUaGUgYWJvdmUgd2FybmluZyBkZXRhaWxzIChjbGljayB0byBleHBhbmQpJ1xuICAgICAgY29uc29sZS5ncm91cENvbGxhcHNlZChncm91cClcbiAgICAgIGNvbnNvbGUuZGlyKGxhc3RBcmcpXG4gICAgICBjb25zb2xlLmdyb3VwRW5kKGdyb3VwKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2Fybih0aGlzLiNiYW5uZXIsIC4uLmFyZ3MpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNob3VsZCBiZSB1c2VkIG9ubHkgYnkgdGhlIGJhY2tncm91bmQgc2NyaXB0XG4gICAqIEBwYXJhbSB7eyBhZGRlZD86IHN0cmluZyB9IHwgeyByZW1vdmVkPzogc3RyaW5nIH19IHJlYXNvblxuICAgKi9cbiAgI29uUG9ydENoYW5nZSAocmVhc29uKSB7XG4gICAgdGhpcy5wb3J0TGlzdCA9IE9iamVjdC5rZXlzKHRoaXMucG9ydE1hcClcbiAgICBjb25zdCBsaXN0ID0gWyAnYmFja2dyb3VuZCcsIC4uLnRoaXMucG9ydExpc3QgXVxuXG4gICAgZm9yIChjb25zdCBwb3J0TmFtZSBvZiB0aGlzLnBvcnRMaXN0KSB7XG4gICAgICB0aGlzLnNlbmQoe1xuICAgICAgICBldmVudDogJ0BxdWFzYXI6cG9ydHMnLFxuICAgICAgICB0bzogcG9ydE5hbWUsXG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBwb3J0TGlzdDogbGlzdC5maWx0ZXIobmFtZSA9PiBuYW1lICE9PSBwb3J0TmFtZSksXG4gICAgICAgICAgLi4ucmVhc29uXG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICBgRmFpbGVkIHRvIGluZm9ybSBcIiR7IHBvcnROYW1lIH1cIiBhYm91dCB0aGUgcG9ydCBsaXN0LmAsXG4gICAgICAgICAgZXJyXG4gICAgICAgIClcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7TWVzc2FnZX0gbWVzc2FnZVxuICAgKi9cbiAgYXN5bmMgI3RyaWdnZXJNZXNzYWdlRXZlbnQgKG1lc3NhZ2UpIHtcbiAgICBjb25zdCBsaXN0ID0gdGhpcy5saXN0ZW5lcnNbIG1lc3NhZ2UuZXZlbnQgXVxuXG4gICAgaWYgKGxpc3QgPT09IHZvaWQgMCkgcmV0dXJuXG5cbiAgICBjb25zdCBwbHVyYWwgPSBsaXN0Lmxlbmd0aCA+IDEgPyAncycgOiAnJ1xuICAgIHRoaXMubG9nKFxuICAgICAgYFRyaWdnZXJpbmcgJHsgbGlzdC5sZW5ndGggfSBsaXN0ZW5lciR7IHBsdXJhbCB9IGZvciBldmVudDogXCIkeyBtZXNzYWdlLmV2ZW50IH1cIi5gLFxuICAgICAgeyBtZXNzYWdlLCBsaXN0ZW5lcnM6IGxpc3QgfVxuICAgIClcblxuICAgIGxldCByZXNwb25zZVBheWxvYWRcbiAgICBmb3IgKGNvbnN0IHsgdHlwZSwgY2FsbGJhY2sgfSBvZiBsaXN0LnNsaWNlKDApKSB7XG4gICAgICBpZiAodHlwZSA9PT0gJ29uY2UnKSB7XG4gICAgICAgIHRoaXMub2ZmKG1lc3NhZ2UuZXZlbnQsIGNhbGxiYWNrKVxuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAocmVzcG9uc2VQYXlsb2FkID09PSB2b2lkIDApIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNhbGxiYWNrKG1lc3NhZ2UpXG4gICAgICAgICAgcmVzcG9uc2VQYXlsb2FkID0gdmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlXG4gICAgICAgICAgICA/IGF3YWl0IHZhbHVlXG4gICAgICAgICAgICA6IHZhbHVlXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2sobWVzc2FnZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgYEVycm9yIHdoaWxlIHRyaWdnZXJpbmcgbGlzdGVuZXIkeyBwbHVyYWwgfSBmb3IgZXZlbnQ6IFwiJHsgbWVzc2FnZS5ldmVudCB9XCIuYCxcbiAgICAgICAgICB7IGVycm9yOiBlcnIsIG1lc3NhZ2UsIGxpc3RlbmVyOiB7IHR5cGUsIGNhbGxiYWNrIH0gfVxuICAgICAgICApXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlUGF5bG9hZFxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwb3J0TmFtZVxuICAgKi9cbiAgI2NsZWFudXBQb3J0IChwb3J0TmFtZSkge1xuICAgIGZvciAoY29uc3QgaWQgaW4gdGhpcy5jaHVua01hcCkge1xuICAgICAgY29uc3QgcGFja2V0ID0gdGhpcy5jaHVua01hcFsgaWQgXVxuICAgICAgaWYgKHBhY2tldC5wb3J0TmFtZSA9PT0gcG9ydE5hbWUpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuY2h1bmtNYXBbIGlkIF1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGlkIGluIHRoaXMubWVzc2FnZU1hcCkge1xuICAgICAgY29uc3QgcGFja2V0ID0gdGhpcy5tZXNzYWdlTWFwWyBpZCBdXG4gICAgICBpZiAocGFja2V0LnBvcnROYW1lID09PSBwb3J0TmFtZSkge1xuICAgICAgICBwYWNrZXQucmVqZWN0KCdDb25uZWN0aW9uIHdhcyBjbG9zZWQnKVxuICAgICAgfVxuICAgIH1cblxuICAgIGRlbGV0ZSB0aGlzLnBvcnRNYXBbIHBvcnROYW1lIF1cbiAgfVxuXG4gICNvblBhY2tldCAocGFja2V0KSB7XG4gICAgLyoqXG4gICAgICogaWYgaXQncyBub3QgYSBwYWNrZXQgc2VudCBieSB0aGlzIGJyaWRnZVxuICAgICAqIHRoZW4gaWdub3JlIGl0XG4gICAgICovXG4gICAgaWYgKFxuICAgICAgT2JqZWN0KHBhY2tldCkgIT09IHBhY2tldFxuICAgICAgfHwgcGFja2V0LmlkID09PSB2b2lkIDBcbiAgICAgIHx8IHBhY2tldC5mcm9tID09PSB2b2lkIDBcbiAgICAgIHx8IHBhY2tldC50byA9PT0gdm9pZCAwXG4gICAgICB8fCBwYWNrZXQudHlwZSA9PT0gdm9pZCAwXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZyhcbiAgICAgICAgJ1JlY2VpdmVkIGEgbWVzc2FnZSB0aGF0IGRvZXMgbm90IGFwcGVhciB0byBiZSBlbWl0dGVkIGJ5IGEgUXVhc2FyIGJyaWRnZSBvciBpcyBtYWxmb3JtZWQuJyxcbiAgICAgICAgcGFja2V0XG4gICAgICApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmxvZyhcbiAgICAgIGBSZWNlaXZlZCBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgZnJvbSBcIiR7IHBhY2tldC5mcm9tIH1cIi5gLFxuICAgICAgcGFja2V0XG4gICAgKVxuXG4gICAgLyoqXG4gICAgICogaWYgdGhlIHBhY2tldCBpcyBub3QgYWRkcmVzc2VkIHRvIHRoaXMgYnJpZGdlXG4gICAgICogdGhlbiBmb3J3YXJkIGl0IHRvIHRoZSB0YXJnZXRcbiAgICAgKi9cbiAgICBpZiAocGFja2V0LnRvICE9PSB0aGlzLnBvcnROYW1lKSB7XG4gICAgICB0aGlzLiNzZW5kUGFja2V0KHBhY2tldCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgdGhpcy53YXJuKFxuICAgICAgICAgIGBGYWlsZWQgdG8gZm9yd2FyZCBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgZnJvbSBcIiR7IHBhY2tldC5mcm9tIH1cIiB0byBcIiR7IHBhY2tldC50byB9XCIuYCxcbiAgICAgICAgICBlcnJcbiAgICAgICAgKVxuXG4gICAgICAgIHRoaXMuI3NlbmRNZXNzYWdlKHtcbiAgICAgICAgICBpZDogcGFja2V0LmlkLFxuICAgICAgICAgIHRvOiBwYWNrZXQuZnJvbSxcbiAgICAgICAgICBtZXNzYWdlVHlwZTogJ2V2ZW50LXJlc3BvbnNlJyxcbiAgICAgICAgICBtZXNzYWdlUHJvcHM6IHtcbiAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxuICAgICAgICAgICAgICBzdGFjazogZXJyLnN0YWNrIHx8ICdubyBzdGFjayBhdmFpbGFibGUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVpZXQ6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHBhY2tldC50eXBlID09PSAnZnVsbCcpIHtcbiAgICAgIHRoaXMuI29uTWVzc2FnZSh7XG4gICAgICAgIGlkOiBwYWNrZXQuaWQsXG4gICAgICAgIGZyb206IHBhY2tldC5mcm9tLFxuICAgICAgICB0bzogcGFja2V0LnRvLFxuICAgICAgICBwYXlsb2FkOiBwYWNrZXQucGF5bG9hZCxcbiAgICAgICAgdHlwZTogcGFja2V0Lm1lc3NhZ2VUeXBlLFxuICAgICAgICBwcm9wczogcGFja2V0Lm1lc3NhZ2VQcm9wc1xuICAgICAgfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChwYWNrZXQudHlwZSA9PT0gJ2NodW5rJykge1xuICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rTWFwWyBwYWNrZXQuaWQgXVxuXG4gICAgICBpZiAoY2h1bmsgPT09IHZvaWQgMCkge1xuICAgICAgICBpZiAocGFja2V0LmNodW5rSW5kZXggIT09IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICAgICdSZWNlaXZlZCBhbiB1bnJlZ2lzdGVyZWQgY2h1bmsuJyxcbiAgICAgICAgICAgIHBhY2tldFxuICAgICAgICAgIClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2h1bmtNYXBbIHBhY2tldC5pZCBdID0ge1xuICAgICAgICAgIHBvcnROYW1lOiBwYWNrZXQuZnJvbSxcbiAgICAgICAgICBudW1iZXI6IHBhY2tldC5jaHVua3NOdW1iZXIsXG4gICAgICAgICAgbWVzc2FnZVR5cGU6IHBhY2tldC5tZXNzYWdlVHlwZSxcbiAgICAgICAgICBtZXNzYWdlUHJvcHM6IHBhY2tldC5tZXNzYWdlUHJvcHMsXG4gICAgICAgICAgcGF5bG9hZDogW11cbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgcmVjZWl2ZWQgYW4gdW5leHBlY3RlZCBjaHVua1xuICAgICAgaWYgKHBhY2tldC5jaHVua0luZGV4ICE9PSBjaHVuay5wYXlsb2FkLmxlbmd0aCkge1xuICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgJ1JlY2VpdmVkIGFuIG91dCBvZiBvcmRlciBjaHVuay4nLFxuICAgICAgICAgIHBhY2tldFxuICAgICAgICApXG5cbiAgICAgICAgLy8gZnJlZSB1cCByZXNvdXJjZXNcbiAgICAgICAgZGVsZXRlIHRoaXMuY2h1bmtNYXBbIHBhY2tldC5pZCBdXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjaHVuay5wYXlsb2FkLnB1c2gocGFja2V0LnBheWxvYWQpXG5cbiAgICAgIC8vIGlmIHdlIHJlY2VpdmVkIGFsbCBjaHVua3MuLi5cbiAgICAgIGlmIChwYWNrZXQuY2h1bmtJbmRleCA9PT0gY2h1bmsubnVtYmVyIC0gMSkge1xuICAgICAgICBkZWxldGUgdGhpcy5jaHVua01hcFsgcGFja2V0LmlkIF1cblxuICAgICAgICB0aGlzLiNvbk1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBwYWNrZXQuaWQsXG4gICAgICAgICAgZnJvbTogcGFja2V0LmZyb20sXG4gICAgICAgICAgdG86IHBhY2tldC50byxcbiAgICAgICAgICBwYXlsb2FkOiBjaHVuay5wYXlsb2FkLFxuICAgICAgICAgIHR5cGU6IGNodW5rLm1lc3NhZ2VUeXBlLFxuICAgICAgICAgIHByb3BzOiBjaHVuay5tZXNzYWdlUHJvcHNcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHBhY2tldC50eXBlID09PSAnY2h1bmstYWJvcnQnKSB7XG4gICAgICBkZWxldGUgdGhpcy5jaHVua01hcFsgcGFja2V0LmlkIF1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMud2FybihcbiAgICAgIGBSZWNlaXZlZCBhbiB1bmtub3duIG1lc3NhZ2UgdHlwZTogXCIkeyBwYWNrZXQudHlwZSB9XCIuYFxuICAgIClcbiAgfVxuXG4gICNzZW5kUGFja2V0IChwYWNrZXQpIHtcbiAgICB0aGlzLmxvZyhcbiAgICAgIHBhY2tldC5mcm9tID09PSB0aGlzLnBvcnROYW1lXG4gICAgICAgID8gYFNlbmRpbmcgbWVzc2FnZSBvZiB0eXBlIFwiJHsgcGFja2V0LnR5cGUgfVwiIHRvIFwiJHsgcGFja2V0LnRvIH1cIi5gXG4gICAgICAgIDogYEZvcndhcmRpbmcgbWVzc2FnZSBvZiB0eXBlIFwiJHsgcGFja2V0LnR5cGUgfVwiIGZyb20gXCIkeyBwYWNrZXQuZnJvbSB9XCIgdG8gXCIkeyBwYWNrZXQudG8gfVwiLmBcbiAgICAgICxcbiAgICAgIHBhY2tldFxuICAgIClcblxuICAgIGNvbnN0IHBvcnQgPSB0aGlzLiN0eXBlID09PSAnYmFja2dyb3VuZCdcbiAgICAgID8gdGhpcy5wb3J0TWFwWyBwYWNrZXQudG8gXVxuICAgICAgOiB0aGlzLnBvcnRNYXAuYmFja2dyb3VuZFxuXG4gICAgaWYgKHRoaXMucG9ydExpc3QuaW5jbHVkZXMocGFja2V0LnRvKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgYFRyaWVkIHRvIHNlbmQgbWVzc2FnZSBvZiB0eXBlIFwiJHsgcGFja2V0LnR5cGUgfVwiIHRvIFwiJHsgcGFja2V0LnRvIH1cIiBidXQgdGhlcmUgaXMgbm8gc3VjaCBwb3J0IHJlZ2lzdGVyZWRgXG4gICAgICApXG4gICAgfVxuXG4gICAgaWYgKHBvcnQgPT09IHZvaWQgMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICB0aGlzLiN0eXBlID09PSAnYmFja2dyb3VuZCdcbiAgICAgICAgICA/IGBUcmllZCB0byBzZW5kIG1lc3NhZ2Ugb2YgdHlwZSBcIiR7IHBhY2tldC50eXBlIH1cIiB0byBcIiR7IHBhY2tldC50byB9XCIgYnV0IHRoZSBwb3J0IGlzIG5vdCBhdmFpbGFibGVgXG4gICAgICAgICAgOiBgVHJpZWQgdG8gc2VuZCBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgdG8gXCIkeyBwYWNrZXQudG8gfVwiIGJ1dCB0aGUgcG9ydCB0byBiYWNrZ3JvdW5kIGlzIG5vdCBhdmFpbGFibGUgdG8gZm9yd2FyZCB0aHJvdWdoYFxuICAgICAgKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKHBhY2tldClcbiAgICB9XG4gICAgY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy53YXJuKFxuICAgICAgICBgRmFpbGVkIHRvIHNlbmQgbWVzc2FnZSB0byBcIiR7IHBhY2tldC50byB9XCIuYCxcbiAgICAgICAgZXJyXG4gICAgICApXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7eyBpZD86IG51bWJlciwgdG86IHN0cmluZywgcGF5bG9hZDogYW55LCBtZXNzYWdlVHlwZTogXCJldmVudC1zZW5kXCIgfCBcImV2ZW50LXJlc3BvbnNlXCIsIG1lc3NhZ2VQcm9wczogYW55IH19IHBhcmFtXG4gICAqL1xuICAjc2VuZE1lc3NhZ2UgKHtcbiAgICBpZCA9IGdldFJhbmRvbUlkKDFfMDAwXzAwMCksXG4gICAgdG8sXG4gICAgcGF5bG9hZCxcbiAgICBtZXNzYWdlVHlwZSxcbiAgICBtZXNzYWdlUHJvcHNcbiAgfSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHBheWxvYWQpID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuI3NlbmRQYWNrZXQoe1xuICAgICAgICBpZCxcbiAgICAgICAgZnJvbTogdGhpcy5wb3J0TmFtZSxcbiAgICAgICAgdG8sXG4gICAgICAgIHR5cGU6ICdmdWxsJyxcbiAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgbWVzc2FnZVR5cGUsXG4gICAgICAgIG1lc3NhZ2VQcm9wc1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBsZXQgcHJvbWlzZSA9IHRoaXMuI3NlbmRQYWNrZXQoe1xuICAgICAgaWQsXG4gICAgICBmcm9tOiB0aGlzLnBvcnROYW1lLFxuICAgICAgdG8sXG4gICAgICB0eXBlOiAnY2h1bmsnLFxuICAgICAgY2h1bmtzTnVtYmVyOiBwYXlsb2FkLmxlbmd0aCxcbiAgICAgIG1lc3NhZ2VUeXBlLFxuICAgICAgbWVzc2FnZVByb3BzXG4gICAgfSlcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGF5bG9hZC5sZW5ndGg7IGkrKykge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB0aGlzLiNzZW5kUGFja2V0KHtcbiAgICAgICAgaWQsXG4gICAgICAgIGZyb206IHRoaXMucG9ydE5hbWUsXG4gICAgICAgIHRvLFxuICAgICAgICB0eXBlOiAnY2h1bmsnLFxuICAgICAgICBwYXlsb2FkOiBwYXlsb2FkWyBpIF0sXG4gICAgICAgIGNodW5rSW5kZXg6IGlcbiAgICAgIH0pKVxuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKGVyciA9PiB7XG4gICAgICB0aGlzLiNzZW5kUGFja2V0KHtcbiAgICAgICAgaWQsXG4gICAgICAgIGZyb206IHRoaXMucG9ydE5hbWUsXG4gICAgICAgIHRvLFxuICAgICAgICB0eXBlOiAnY2h1bmstYWJvcnQnXG4gICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgYEZhaWxlZCB0byBzZW5kIGEgY2h1bmstYWJvcnQgbWVzc2FnZSB0byBcIiR7IHRvIH1cIi5gLFxuICAgICAgICAgIGVyclxuICAgICAgICApXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKVxuICAgIH0pXG4gIH1cblxuICAjb25NZXNzYWdlIChtZXNzYWdlKSB7XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2V2ZW50LXJlc3BvbnNlJykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5tZXNzYWdlTWFwWyBtZXNzYWdlLmlkIF1cblxuICAgICAgaWYgKHRhcmdldCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLnByb3BzLnF1aWV0ICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhpcy53YXJuKFxuICAgICAgICAgICAgYFJlY2VpdmVkIGEgcmVzcG9uc2UgZm9yIGFuIHVua25vd24gbWVzc2FnZSBpZDogXCIkeyBtZXNzYWdlLmlkIH1cIi5gLFxuICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UucHJvcHMuZXJyb3IgIT09IHZvaWQgMCkge1xuICAgICAgICB0YXJnZXQucmVqZWN0KG1lc3NhZ2UucHJvcHMuZXJyb3IpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGFyZ2V0LnJlc29sdmUobWVzc2FnZS5wYXlsb2FkKVxuICAgICAgfVxuXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSAnZXZlbnQtc2VuZCcpIHtcbiAgICAgIHRoaXMuI3RyaWdnZXJNZXNzYWdlRXZlbnQoe1xuICAgICAgICBmcm9tOiBtZXNzYWdlLmZyb20sXG4gICAgICAgIHRvOiBtZXNzYWdlLnRvLFxuICAgICAgICBldmVudDogbWVzc2FnZS5wcm9wcy5ldmVudCxcbiAgICAgICAgcGF5bG9hZDogbWVzc2FnZS5wYXlsb2FkXG4gICAgICB9KS50aGVuKHJldHVyblBheWxvYWQgPT4ge1xuICAgICAgICB0aGlzLiNzZW5kTWVzc2FnZSh7XG4gICAgICAgICAgaWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgICAgdG86IG1lc3NhZ2UuZnJvbSxcbiAgICAgICAgICBwYXlsb2FkOiByZXR1cm5QYXlsb2FkLFxuICAgICAgICAgIG1lc3NhZ2VUeXBlOiAnZXZlbnQtcmVzcG9uc2UnLFxuICAgICAgICAgIG1lc3NhZ2VQcm9wczoge31cbiAgICAgICAgfSlcbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIHRoaXMuI3NlbmRNZXNzYWdlKHtcbiAgICAgICAgICBpZDogbWVzc2FnZS5pZCxcbiAgICAgICAgICB0bzogbWVzc2FnZS5mcm9tLFxuICAgICAgICAgIG1lc3NhZ2VUeXBlOiAnZXZlbnQtcmVzcG9uc2UnLFxuICAgICAgICAgIG1lc3NhZ2VQcm9wczoge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIHN0YWNrOiBlcnIuc3RhY2sgfHwgJ25vIHN0YWNrIGF2YWlsYWJsZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLndhcm4oXG4gICAgICBgUmVjZWl2ZWQgYSBtZXNzYWdlIHdpdGggdW5rbm93biB0eXBlOiBcIiR7IG1lc3NhZ2UudHlwZSB9XCIuYCxcbiAgICAgIG1lc3NhZ2VcbiAgICApXG4gIH1cbn1cbiIsICJpbXBvcnQgeyBCZXhCcmlkZ2UgfSBmcm9tICcuL3ByaXZhdGUvYmV4LWJyaWRnZS5qcydcblxuLyoqXG4gKiBPbmx5IHJ1biB0aGVzZSBpbiBkZXZlbG9wbWVudCBtb2RlIGFuZCBpbiBDaHJvbWUuXG4gKiBPbmx5IENocm9tZSBhbGxvd3MgdGhlIGJhY2tncm91bmQgY291bnRlcnBhcnQgaW5pdGlhbGl6YXRpb25cbiAqIHRvIHRha2UgcGxhY2UgaW4gYSBzZXJ2aWNlIHdvcmtlci5cbiAqL1xuaWYgKHByb2Nlc3MuZW52LkRFViA9PT0gdHJ1ZSAmJiBwcm9jZXNzLmVudi5UQVJHRVQgPT09ICdjaHJvbWUnKSB7XG4gIGxldCBzY3JpcHRJc1JlbG9hZGluZyA9IGZhbHNlXG5cbiAgY29uc3Qgc2NyaXB0TmFtZSA9IHByb2Nlc3MuZW52Ll9fUVVBU0FSX0JFWF9TQ1JJUFRfTkFNRV9fXG4gIGNvbnN0IHBvcnROYW1lID0gYHF1YXNhckBobXIvY29udGVudC1zY3JpcHQvJHsgc2NyaXB0TmFtZSB9YFxuICBjb25zdCBiYW5uZXIgPSBgW1FCZXh8SE1SXSBbJHsgc2NyaXB0TmFtZSB9XWBcblxuICBjb25zdCBvbk1lc3NhZ2UgPSBtZXNzYWdlID0+IHtcbiAgICBpZiAobWVzc2FnZSA9PT0gJ3FiZXg6aG1yOmhlbGxvJykge1xuICAgICAgY29uc29sZS5sb2coYCR7IGJhbm5lciB9IENvbm5lY3RlZCB0byBiYWNrZ3JvdW5kYClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChtZXNzYWdlID09PSAncWJleDpobXI6cmVsb2FkLWNvbnRlbnQnKSB7XG4gICAgICBjb25zb2xlLmxvZyhgJHsgYmFubmVyIH0gUmVsb2FkIHJlcXVlc3RlZCBieSBiYWNrZ3JvdW5kLi4uYClcbiAgICAgIHNjcmlwdElzUmVsb2FkaW5nID0gdHJ1ZVxuXG4gICAgICAvLyByZWxvYWQgdGhlIHBhZ2Ugd2l0aCBhIHNtYWxsIGRlbGF5LFxuICAgICAgLy8gdG8gYWxsb3cgdGhlIGV4dGVuc2lvbiB0byBiZSBhbHNvIHJlbG9hZGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXG4gICAgICB9LCAxMDApXG4gICAgfVxuICB9XG5cbiAgY29uc3QgY29ubmVjdCA9ICgpID0+IHtcbiAgICBjb25zdCBwb3J0ID0gY2hyb21lLnJ1bnRpbWUuY29ubmVjdCh7IG5hbWU6IHBvcnROYW1lIH0pXG5cbiAgICBwb3J0Lm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihvbk1lc3NhZ2UpXG4gICAgcG9ydC5vbkRpc2Nvbm5lY3QuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICAgICAgaWYgKHNjcmlwdElzUmVsb2FkaW5nID09PSB0cnVlKSByZXR1cm5cbiAgICAgIHBvcnQub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKG9uTWVzc2FnZSlcblxuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcj8ubWVzc2FnZT8uaW5kZXhPZignQ291bGQgbm90IGVzdGFibGlzaCBjb25uZWN0aW9uJykgIT09IC0xXG4gICAgICAgICAgPyBgJHsgYmFubmVyIH0gQ291bGQgbm90IGNvbm5lY3QgdG8gYmFja2dyb3VuZGBcbiAgICAgICAgICA6IGAkeyBiYW5uZXIgfSBMb3N0IGNvbm5lY3Rpb24gdG8gYmFja2dyb3VuZGBcbiAgICAgIClcblxuICAgICAgc2V0VGltZW91dChjb25uZWN0LCAxMDAwKVxuICAgIH0pXG4gIH1cblxuICBjb25uZWN0KClcbn1cblxubGV0IHNjcmlwdEhhc0JyaWRnZSA9IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCcmlkZ2UgKHsgZGVidWcgfSA9IHt9KSB7XG4gIGlmIChzY3JpcHRIYXNCcmlkZ2UgPT09IHRydWUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdDb250ZW50IHNjcmlwdCBRdWFzYXIgQnJpZGdlIGhhcyBhbHJlYWR5IGJlZW4gY3JlYXRlZC4nKVxuICAgIHJldHVyblxuICB9XG5cbiAgc2NyaXB0SGFzQnJpZGdlID0gdHJ1ZVxuICByZXR1cm4gbmV3IEJleEJyaWRnZSh7XG4gICAgdHlwZTogJ2NvbnRlbnQnLFxuICAgIG5hbWU6IHByb2Nlc3MuZW52Ll9fUVVBU0FSX0JFWF9TQ1JJUFRfTkFNRV9fLFxuICAgIGRlYnVnXG4gIH0pXG59XG4iLCAiXG5cbmxldCBmYWtlID0ge1xuICAgIGNvb3Jkczoge1xuICAgICAgICBhY2N1cmFjeTogMTEuMDAwLFxuICAgICAgICBhbHRpdHVkZTogbnVsbCxcbiAgICAgICAgYWx0aXR1ZGVBY2N1cmFjeTogbnVsbCxcbiAgICAgICAgaGVhZGluZzogbnVsbCxcbiAgICAgICAgc3BlZWQ6IG51bGwsXG4gICAgICAgIGxhdGl0dWRlOiAxMS4xMTExMTEsXG4gICAgICAgIGxvbmdpdHVkZTogMjIuMjIyMjIsXG4gICAgICAgIG1hZ2ljOiBcImcgd2FzIGhlcmVcIixcbiAgICB9LFxuICAgIHRpbWVzdGFtcDogOTk5OTk5OTlcbn1cblxudmFyIG1hcEZha2UgPSBmdW5jdGlvbihzZWxlY3RlZCl7XG4gICAgZmFrZS5jb29yZHMubGF0aXR1ZGUgPSBzZWxlY3RlZC5sYXRcbiAgICBmYWtlLmNvb3Jkcy5sb25naXR1ZGUgPSBzZWxlY3RlZC5sbmdcbiAgICBmYWtlLnRpbWVzdGFtcCA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG4gICAgcmV0dXJuIGZha2Vcbn1cblxuZnVuY3Rpb24gZG9NYWdpYyhmYWtlKXtcbiAgICBjb25zb2xlLmxvZyhcIltob29rXSBkb01hZ2ljXCIsIGZha2UpXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW2hvb2tdIHNlbmRpbmcgcG9zdCBtZXNzYWdlIHRvIGluamVjdFwiLCBmYWtlKVxuICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZ3BzLnNldCcsIGZha2UgfSwgJyonKVxuICAgIH0sIDUwKTsgICAgXG59XG5cbmZ1bmN0aW9uIGluaXRDYWxsKCl7XG4gICAgbGV0IGtleSA9ICdfZ3BzX3NlbGVjdGVkJ1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChba2V5XSwgciA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIltob29rXSBzdG9yYWdlLmdldCBpbml0aWFsXCIsIHJba2V5XSlcbiAgICAgIGlmKHJba2V5XSl7XG4gICAgICAgICAgbGV0IG5ld0Zha2UgPSBtYXBGYWtlKHJba2V5XSlcbiAgXG4gICAgICAgICAgaWYobmV3RmFrZS5jb29yZHMubGF0aXR1ZGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbaG9va10gRm91bmQgc2F2ZWQgc3RvcmFnZSBsb2NhdGlvbiwgcnVubmluZyBpbmpjdGlvblwiKVxuICAgICAgICAgICAgZG9NYWdpYyhuZXdGYWtlKVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxufVxuXG5pbml0Q2FsbCgpXG5cblxuaW1wb3J0IHsgY3JlYXRlQnJpZGdlIH0gZnJvbSAnI3EtYXBwL2JleC9jb250ZW50J1xuY29uc3QgYnJpZGdlID0gY3JlYXRlQnJpZGdlKHsgZGVidWc6IGZhbHNlIH0pXG5cbmJyaWRnZS5jb25uZWN0VG9CYWNrZ3JvdW5kKClcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbaG9va10gQ29ubmVjdGVkIHRvIGJhY2tncm91bmQnKVxuICAgIH0pXG4gICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tob29rXSBGYWlsZWQgdG8gY29ubmVjdCB0byBiYWNrZ3JvdW5kOicsIGVycilcbiAgICB9KVxuXG4gIFxuYnJpZGdlLm9uKCd0ZXN0JywgYXN5bmMgKHsgcGF5bG9hZCB9KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJbaG9va10gZXZlbnQgcmVjZWl2ZWRcIiwgcGF5bG9hZCwgbWFwRmFrZShwYXlsb2FkLnNlbGVjdGVkKSlcbiAgICBkb01hZ2ljKCBtYXBGYWtlKHBheWxvYWQuc2VsZWN0ZWQpIClcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH1cbn0pXG5cbi8vIGJyaWRnZS5vbignc2V0TG9jYXRpb24nLCAoeyBwYXlsb2FkIH0pID0+IHtcbi8vICAgICBjb25zb2xlLmxvZygnW2hvb2tdIHNldExvY2F0aW9uIGV2ZW50IHJlY2VpdmVkJywgcGF5bG9hZClcbi8vICAgICBkb01hZ2ljKG1hcEZha2UocGF5bG9hZCkpXG4vLyB9KVxuXG4vLyBMaXN0ZW4gZm9yIGNvbnRlbnQgc2NyaXB0IHJlZ2lzdHJhdGlvblxuYnJpZGdlLm9uKCdjb250ZW50U2NyaXB0UmVhZHknLCAoeyBmcm9tIH0pID0+IHtcbiAgICBjb25zb2xlLmxvZygnW2hvb2tdIENvbnRlbnQgc2NyaXB0IHJlYWR5OicsIGZyb20pXG59KVxuXG5jb25zb2xlLmxvZyhcIltob29rXSBpbmplY3QtaG9vayBsb2FkZWRcIilcblxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLGFBQWE7QUFDbkIsTUFBTSxFQUFFLFFBQVEsSUFBSSxRQUFtQyxVQUFVO0FBTWpFLFdBQVMsWUFBYSxLQUFLO0FBQ3pCLFdBQU8sS0FBSyxNQUFNLEtBQUssT0FBTyxJQUFJLEdBQUc7QUFBQSxFQUN2QztBQVRB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
