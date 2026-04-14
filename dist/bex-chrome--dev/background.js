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
  function interceptRequests(devServerPort) {
    const bexOrigin = `chrome-extension://${chrome.runtime.id}`;
    const hrefRE = /=$|=(?=&)/g;
    async function getDevServerResponse(url) {
      url.protocol = "http:";
      url.host = "localhost";
      url.port = devServerPort;
      url.searchParams.set("t", Date.now());
      const request = await fetch(
        url.href.replace(hrefRE, "")
      );
      return new Response(request.body, {
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "text/javascript",
          "Cache-Control": request.headers.get("Cache-Control") || ""
        }
      });
    }
    self.addEventListener("fetch", (evt) => {
      const url = new URL(evt.request.url);
      if (url.origin === bexOrigin) {
        evt.respondWith(
          getDevServerResponse(url)
        );
      }
    });
  }
  function connectToDevServer(devServerPort, wsToken) {
    const pingUrl = `http://localhost:${devServerPort}/__vite_ping`;
    const socket = new WebSocket(`ws://localhost:${devServerPort}?token=${wsToken}`, "vite-hmr");
    const contentScriptPortList = /* @__PURE__ */ new Set();
    const contentScriptPortNameRE = /^quasar@hmr\/content-script\//;
    function reloadExtension() {
      const len = contentScriptPortList.size;
      const suffix = len !== 0 ? ` along with ${len} content script${len > 1 ? "s" : ""}` : "";
      console.log(`[QBex|HMR] Reloading extension${suffix}...`);
      for (const port of contentScriptPortList) {
        port.postMessage("qbex:hmr:reload-content");
      }
      chrome.runtime.reload();
    }
    socket.addEventListener("message", ({ data }) => {
      const { type, event } = JSON.parse(data);
      if (type === "connected") {
        console.log("[QBex|HMR] Connected");
        const interval = setInterval(() => socket.send("ping"), 3e4);
        socket.addEventListener("close", () => clearInterval(interval));
        return;
      }
      if (type === "custom" && event === "qbex:hmr:reload") {
        reloadExtension();
      }
    });
    socket.addEventListener("close", async ({ wasClean }) => {
      if (wasClean) return;
      console.log("[QBex|HMR] Lost connection. Reconnecting...");
      let tries = 1;
      while (true) {
        try {
          if (tries > 2e3) {
            console.log("[QBex|HMR] Aborting re-connect after 2000 failed attempts. Please manually reload the extension.");
            return;
          }
          await fetch(pingUrl);
          break;
        } catch (_) {
          console.log("[QBex|HMR] Could not re-connect. Retrying...");
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          tries++;
        }
      }
      reloadExtension();
    });
    chrome.runtime.onConnect.addListener((port) => {
      const { name } = port;
      if (contentScriptPortNameRE.test(name) === true) {
        contentScriptPortList.add(port);
        port.onDisconnect.addListener(() => {
          contentScriptPortList.delete(port);
        });
        port.postMessage("qbex:hmr:hello");
      }
    });
  }
  if (true) {
    const devServerPort = 9600;
    const wsToken = "AKHJaQsZ1X7z";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vbm9kZV9tb2R1bGVzL0BxdWFzYXIvYXBwLXZpdGUvZXhwb3J0cy9iZXgvcHJpdmF0ZS9iZXgtYnJpZGdlLmpzIiwgIi4uLy4uL25vZGVfbW9kdWxlcy9AcXVhc2FyL2FwcC12aXRlL2V4cG9ydHMvYmV4L2JhY2tncm91bmQuanMiLCAiLi4vLi4vc3JjLWJleC9iYWNrZ3JvdW5kLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBwb3J0TmFtZVJFID0gL15iYWNrZ3JvdW5kJHxeYXBwJHxeY29udGVudEAvXG5jb25zdCB7IHJ1bnRpbWUgfSA9IHByb2Nlc3MuZW52LlRBUkdFVCA9PT0gJ2ZpcmVmb3gnID8gYnJvd3NlciA6IGNocm9tZVxuXG4vKipcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXhcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldFJhbmRvbUlkIChtYXgpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1heClcbn1cblxuLyoqXG4gKiBAdHlwZWRlZiBNZXNzYWdlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZnJvbVxuICogQHByb3BlcnR5IHtzdHJpbmd9IHRvXG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXZlbnRcbiAqIEBwcm9wZXJ0eSB7YW55fSBwYXlsb2FkXG4gKi9cblxuZXhwb3J0IGNsYXNzIEJleEJyaWRnZSB7XG4gIC8vIFB1YmxpYyBwcm9wZXJ0aWVzXG4gIC8qKiBAdHlwZSB7c3RyaW5nfSAqL1xuICBwb3J0TmFtZSA9IG51bGxcbiAgLyoqIEB0eXBlIHtib29sZWFufSAqL1xuICBpc0Nvbm5lY3RlZCA9IGZhbHNlXG4gIC8qKiBAdHlwZSB7eyB0eXBlOiAnb24nIHwgJ29uY2UnLCBjYWxsYmFjazogKG1lc3NhZ2U6IE1lc3NhZ2UpID0+IHZvaWQgfVtdfSAqL1xuICBsaXN0ZW5lcnMgPSB7fVxuICAvKiogQHR5cGUge3sgW3BvcnROYW1lOiBzdHJpbmddOiBjaHJvbWUucnVudGltZS5Qb3J0IH19ICovXG4gIHBvcnRNYXAgPSB7fVxuICAvKiogQHR5cGUge3N0cmluZ1tdfSAqL1xuICBwb3J0TGlzdCA9IFtdXG4gIC8qKiBAdHlwZSB7eyBbaWQ6IHN0cmluZ106IHsgcG9ydE5hbWU6IHN0cmluZywgcmVzb2x2ZTogKHBheWxvYWQ6IGFueSkgPT4gdm9pZCwgcmVqZWN0OiAoZXJyOiBhbnkpID0+IHZvaWQgfSB9fSAqL1xuICBtZXNzYWdlTWFwID0ge31cbiAgLyoqIEB0eXBlIHt7IFtpZDogc3RyaW5nXTogeyBwb3J0TmFtZTogc3RyaW5nLCBudW1iZXI6IG51bWJlciwgbWVzc2FnZVR5cGU6IHN0cmluZywgbWVzc2FnZVByb3BzOiBhbnksIHBheWxvYWQ6IGFueVtdIH0gfX0gKi9cbiAgY2h1bmtNYXAgPSB7fVxuXG4gIC8vIFByaXZhdGUgcHJvcGVydGllc1xuICAvKiogQHR5cGUgeydiYWNrZ3JvdW5kJyB8ICdjb250ZW50JyB8ICdhcHAnfSAqL1xuICAjdHlwZVxuICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICNkZWJ1ZyA9IGZhbHNlXG4gIC8qKiBAdHlwZSB7c3RyaW5nfSAqL1xuICAjYmFubmVyXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7eyB0eXBlOiAnYmFja2dyb3VuZCcgfCAnY29udGVudCcgfCAnYXBwJywgbmFtZT86IHN0cmluZywgZGVidWc/OiBib29sZWFuIH19IG9wdGlvbnNcbiAgICovXG4gIGNvbnN0cnVjdG9yICh7IHR5cGUsIG5hbWUgPSAnJywgZGVidWcgfSkge1xuICAgIHRoaXMucG9ydE5hbWUgPSB0eXBlXG4gICAgdGhpcy4jdHlwZSA9IHR5cGVcblxuICAgIGlmICh0eXBlID09PSAnY29udGVudCcpIHtcbiAgICAgIC8qKlxuICAgICAgICogVGhlcmUgY2FuIGJlIG11bHRpcGxlIGluc3RhbmNlcyBvZiB0aGUgc2FtZSBjb250ZW50IHNjcmlwdFxuICAgICAgICogYnV0IGZvciBkaWZmZXJlbnQgdGFicywgc28gd2UgbmVlZCB0byBkaWZmZXJlbnRpYXRlIHRoZW0uXG4gICAgICAgKlxuICAgICAgICogR2VuZXJhdGluZyBhbiBlYXN5IHRvIGhhbmRsZSBpZCBmb3IgdGhlIGNvbnRlbnQgc2NyaXB0LlxuICAgICAgICovXG4gICAgICB0aGlzLnBvcnROYW1lID0gYCR7IHR5cGUgfUAkeyBuYW1lIH0tJHsgZ2V0UmFuZG9tSWQoMTBfMDAwKSB9YFxuICAgIH1cblxuICAgIHRoaXMuI2Jhbm5lciA9IGBbUUJleHwkeyB0aGlzLnBvcnROYW1lIH1dYFxuICAgIHRoaXMuI2RlYnVnID0gZGVidWcgPT09IHRydWVcblxuICAgIGlmICh0eXBlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICAgIHRoaXMub24oJ0BxdWFzYXI6cG9ydHMnLCAoeyBwYXlsb2FkIH0pID0+IHtcbiAgICAgICAgdGhpcy5wb3J0TGlzdCA9IHBheWxvYWQucG9ydExpc3RcbiAgICAgICAgaWYgKHBheWxvYWQucmVtb3ZlZCAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgdGhpcy4jY2xlYW51cFBvcnQocGF5bG9hZC5yZW1vdmVkKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbHNlIHdlJ3JlIHRoZSBiYWNrZ3JvdW5kIHNjcmlwdFxuICAgICAqL1xuXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWVcbiAgICBjb25zdCBvblBhY2tldCA9IHRoaXMuI29uUGFja2V0LmJpbmQodGhpcylcblxuICAgIHJ1bnRpbWUub25Db25uZWN0LmFkZExpc3RlbmVyKHBvcnQgPT4ge1xuICAgICAgLy8gaWYgaXQncyBub3QgYSBicmlkZ2UgcG9ydCBvbiB0aGUgb3RoZXIgZW5kLFxuICAgICAgLy8gdGhlbiBpZ25vcmUgaXRcbiAgICAgIGlmIChwb3J0TmFtZVJFLnRlc3QocG9ydC5uYW1lKSA9PT0gZmFsc2UpIHJldHVyblxuXG4gICAgICBpZiAodGhpcy5wb3J0TWFwWyBwb3J0Lm5hbWUgXSAhPT0gdm9pZCAwKSB7XG4gICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICBgQ29ubmVjdGlvbiB3aXRoIFwiJHsgcG9ydC5uYW1lIH1cIiBhbHJlYWR5IGV4aXN0cy5gXG4gICAgICAgICAgKyAnIERpc2Nvbm5lY3RpbmcgdGhlIHByZXZpb3VzIG9uZSBhbmQgY29ubmVjdGluZyB0aGUgbmV3IG9uZS4nXG4gICAgICAgIClcbiAgICAgICAgdGhpcy5wb3J0TWFwWyBwb3J0Lm5hbWUgXS5kaXNjb25uZWN0KClcbiAgICAgICAgdGhpcy4jY2xlYW51cFBvcnQocG9ydC5uYW1lKVxuICAgICAgfVxuXG4gICAgICB0aGlzLnBvcnRNYXBbIHBvcnQubmFtZSBdID0gcG9ydFxuXG4gICAgICBwb3J0Lm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihvblBhY2tldClcbiAgICAgIHBvcnQub25EaXNjb25uZWN0LmFkZExpc3RlbmVyKCgpID0+IHtcbiAgICAgICAgcG9ydC5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIob25QYWNrZXQpXG4gICAgICAgIHRoaXMuI2NsZWFudXBQb3J0KHBvcnQubmFtZSlcbiAgICAgICAgdGhpcy5sb2coYENsb3NlZCBjb25uZWN0aW9uIHdpdGggJHsgcG9ydC5uYW1lIH0uYClcbiAgICAgICAgdGhpcy4jb25Qb3J0Q2hhbmdlKHsgcmVtb3ZlZDogcG9ydC5uYW1lIH0pXG4gICAgICB9KVxuXG4gICAgICB0aGlzLmxvZyhgT3BlbmVkIGNvbm5lY3Rpb24gd2l0aCAkeyBwb3J0Lm5hbWUgfS5gKVxuICAgICAgdGhpcy4jb25Qb3J0Q2hhbmdlKHsgYWRkZWQ6IHBvcnQubmFtZSB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMge1Byb21pc2U8dm9pZD59XG4gICAqL1xuICBjb25uZWN0VG9CYWNrZ3JvdW5kICgpIHtcbiAgICBpZiAodGhpcy4jdHlwZSA9PT0gJ2JhY2tncm91bmQnKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ1RoZSBiYWNrZ3JvdW5kIHNjcmlwdCBpdHNlbGYgZG9lcyBub3QgbmVlZCB0byBjb25uZWN0JylcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdUaGUgYnJpZGdlIGlzIGFscmVhZHkgY29ubmVjdGVkJylcbiAgICB9XG5cbiAgICBjb25zdCBwb3J0VG9CYWNrZ3JvdW5kID0gcnVudGltZS5jb25uZWN0KHsgbmFtZTogdGhpcy5wb3J0TmFtZSB9KVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUGFja2V0ID0gcGFja2V0ID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogV2UgcmVseSBvbiB0aGUgZmFjdCB0aGF0IHVwb24gY29ubmVjdGlvbiBpcyBlc3RhYmxpc2hlZFxuICAgICAgICAgICAqIHRoZSBiYWNrZ3JvdW5kIHNjcmlwdCB3aWxsIHNlbmQgYSBAcXVhc2FyOnBvcnRzIGV2ZW50XG4gICAgICAgICAgICovXG4gICAgICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWVcbiAgICAgICAgICB0aGlzLmxvZygnQ29ubmVjdGVkIHRvIHRoZSBiYWNrZ3JvdW5kIHNjcmlwdC4nKVxuICAgICAgICAgIHRoaXMucG9ydE1hcCA9IHsgYmFja2dyb3VuZDogcG9ydFRvQmFja2dyb3VuZCB9XG4gICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLiNvblBhY2tldChwYWNrZXQpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG9uRGlzY29ubmVjdCA9ICgpID0+IHtcbiAgICAgICAgaWYgKHJ1bnRpbWUubGFzdEVycm9yPy5tZXNzYWdlPy5pbmRleE9mKCdDb3VsZCBub3QgZXN0YWJsaXNoIGNvbm5lY3Rpb24nKSAhPT0gLTEpIHtcbiAgICAgICAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2VcbiAgICAgICAgICBwb3J0VG9CYWNrZ3JvdW5kLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihvblBhY2tldClcbiAgICAgICAgICBwb3J0VG9CYWNrZ3JvdW5kLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihvbkRpc2Nvbm5lY3QpXG4gICAgICAgICAgcmVqZWN0KCdDb3VsZCBub3QgY29ubmVjdCB0byB0aGUgYmFja2dyb3VuZCBzY3JpcHQuJylcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGZvciAoY29uc3QgaWQgaW4gdGhpcy5tZXNzYWdlTWFwKSB7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMubWVzc2FnZU1hcFsgaWQgXVxuICAgICAgICAgIGl0ZW0ucmVqZWN0KCdDb25uZWN0aW9uIHdhcyBjbG9zZWQnKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wb3J0TWFwID0ge31cbiAgICAgICAgdGhpcy5wb3J0TGlzdCA9IFtdXG4gICAgICAgIHRoaXMubWVzc2FnZU1hcCA9IHt9XG4gICAgICAgIHRoaXMuY2h1bmtNYXAgPSB7fVxuXG4gICAgICAgIHRoaXMubG9nKCdDbG9zZWQgY29ubmVjdGlvbiB3aXRoIHRoZSBiYWNrZ3JvdW5kIHNjcmlwdC4nKVxuICAgICAgfVxuXG4gICAgICBwb3J0VG9CYWNrZ3JvdW5kLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihvblBhY2tldClcbiAgICAgIHBvcnRUb0JhY2tncm91bmQub25EaXNjb25uZWN0LmFkZExpc3RlbmVyKG9uRGlzY29ubmVjdClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxuICAgKi9cbiAgZGlzY29ubmVjdEZyb21CYWNrZ3JvdW5kICgpIHtcbiAgICBpZiAodGhpcy4jdHlwZSA9PT0gJ2JhY2tncm91bmQnKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ0JhY2tncm91bmQgc2NyaXB0IGRvZXMgbm90IG5lZWQgdG8gZGlzY29ubmVjdCcpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ1RyaWVkIHRvIGRpc2Nvbm5lY3QgZnJvbSB0aGUgYmFja2dyb3VuZCBzY3JpcHQgYnV0IHRoZSBwb3J0IHdhcyBub3QgY29ubmVjdGVkJylcbiAgICB9XG5cbiAgICB0aGlzLnBvcnRNYXAuYmFja2dyb3VuZC5kaXNjb25uZWN0KClcbiAgICBkZWxldGUgdGhpcy5wb3J0TWFwLmJhY2tncm91bmRcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2VcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRcbiAgICogQHBhcmFtIHsobWVzc2FnZTogTWVzc2FnZSkgPT4gdm9pZH0gY2FsbGJhY2tcbiAgICovXG4gIG9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICB0aGlzLndhcm4oJ1RyaWVkIGFkZCBsaXN0ZW5lciBidXQgbm8gZXZlbnQgc3BlY2lmaWVkLicpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLndhcm4oJ1RyaWVkIGFkZCBsaXN0ZW5lciBidXQgbm8gdmFsaWQgY2FsbGJhY2sgZnVuY3Rpb24gc3BlY2lmaWVkLicpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXSB8fCAodGhpcy5saXN0ZW5lcnNbIGV2ZW50IF0gPSBbXSlcbiAgICB0YXJnZXQucHVzaCh7IHR5cGU6ICdvbicsIGNhbGxiYWNrIH0pXG4gICAgdGhpcy5sb2coYEFkZGVkIGEgbGlzdGVuZXIgZm9yIGV2ZW50OiBcIiR7IGV2ZW50IH1cIi5gKVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0geyhtZXNzYWdlOiBNZXNzYWdlKSA9PiB2b2lkfSBjYWxsYmFja1xuICAgKi9cbiAgb25jZSAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFldmVudCkge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCBhZGQgbGlzdGVuZXIgYnV0IG5vIGV2ZW50IHNwZWNpZmllZC4nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCBhZGQgbGlzdGVuZXIgYnV0IG5vIHZhbGlkIGNhbGxiYWNrIGZ1bmN0aW9uIHNwZWNpZmllZC4nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5saXN0ZW5lcnNbIGV2ZW50IF0gfHwgKHRoaXMubGlzdGVuZXJzWyBldmVudCBdID0gW10pXG4gICAgdGFyZ2V0LnB1c2goeyB0eXBlOiAnb25jZScsIGNhbGxiYWNrIH0pXG4gICAgdGhpcy5sb2coYEFkZGVkIGEgb25lLXRpbWUgbGlzdGVuZXIgZm9yIGV2ZW50OiBcIiR7IGV2ZW50IH1cIi5gKVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0geyhtZXNzYWdlOiBNZXNzYWdlKSA9PiB2b2lkfSBjYWxsYmFja1xuICAgKi9cbiAgb2ZmIChldmVudCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICB0aGlzLndhcm4oJ1RyaWVkIHRvIHJlbW92ZSBsaXN0ZW5lcnMgYnV0IG5vIGV2ZW50IHNwZWNpZmllZC4nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgbGlzdCA9IHRoaXMubGlzdGVuZXJzWyBldmVudCBdXG5cbiAgICBpZiAobGlzdCA9PT0gdm9pZCAwKSB7XG4gICAgICB0aGlzLndhcm4oYFRyaWVkIHRvIHJlbW92ZSBsaXN0ZW5lciBmb3IgXCIkeyBldmVudCB9XCIgZXZlbnQgYnV0IHRoZXJlIGlzIG5vIHN1Y2ggbGlzdGVuZXIgYXR0YWNoZWQuYClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChjYWxsYmFjayA9PT0gdm9pZCAwKSB7XG4gICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQHF1YXNhcjonKSkge1xuICAgICAgICAvLyBlbnN1cmUgd2UgZG9uJ3QgcmVtb3ZlIGludGVybmFsIGxpc3RlbmVyc1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1sgZXZlbnQgXSA9IFsgbGlzdFsgMCBdIF1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5saXN0ZW5lcnNbIGV2ZW50IF1cbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2coYFN0b3BwZWQgbGlzdGVuaW5nIGZvciBcIiR7IGV2ZW50IH1cIi5gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy53YXJuKCdUcmllZCB0byByZW1vdmUgbGlzdGVuZXIgYnV0IHRoZSBjYWxsYmFjayBzcGVjaWZpZWQgaXMgbm90IGEgZnVuY3Rpb24uJylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IGxpdmVFdmVudHMgPSBsaXN0LmZpbHRlcihlbnRyeSA9PiBlbnRyeS5jYWxsYmFjayAhPT0gY2FsbGJhY2spXG5cbiAgICBpZiAobGl2ZUV2ZW50cy5sZW5ndGggIT09IDApIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzWyBldmVudCBdID0gbGl2ZUV2ZW50c1xuICAgICAgdGhpcy5sb2coYFJlbW92ZWQgYSBsaXN0ZW5lciBmb3I6IFwiJHsgZXZlbnQgfVwiLmApXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVsZXRlIHRoaXMubGlzdGVuZXJzWyBldmVudCBdXG4gICAgICB0aGlzLmxvZyhgU3RvcHBlZCBsaXN0ZW5pbmcgZm9yOiBcIiR7IGV2ZW50IH1cIi5gKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3sgZXZlbnQ6IHN0cmluZywgdG86IHN0cmluZywgcGF5bG9hZDogYW55IH0gfCB1bmRlZmluZWR9IHBhcmFtXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPGFueT59IHJlc3BvbnNlIHBheWxvYWRcbiAgICovXG4gIGFzeW5jIHNlbmQgKHsgZXZlbnQsIHRvLCBwYXlsb2FkIH0gPSB7fSkge1xuICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBzZW5kIG1lc3NhZ2UgYnV0IHRoZSBicmlkZ2UgaXMgbm90IGNvbm5lY3RlZC4gUGxlYXNlIGNvbm5lY3QgaXQgZmlyc3QuJylcbiAgICB9XG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIHNlbmQgbWVzc2FnZSB3aXRoIG5vIFwiZXZlbnRcIiBwcm9wIHNwZWNpZmllZCcpXG4gICAgfVxuXG4gICAgaWYgKCF0bykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBzZW5kIG1lc3NhZ2Ugd2l0aCBubyBcInRvXCIgcHJvcCBzcGVjaWZpZWQnKVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBvcnRMaXN0LmluY2x1ZGVzKHRvKSA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgdGhpcy4jdHlwZSA9PT0gJ2JhY2tncm91bmQnXG4gICAgICAgICAgPyBgVHJpZWQgdG8gc2VuZCBtZXNzYWdlIHRvIFwiJHsgdG8gfVwiIGJ1dCB0aGVyZSBpcyBubyBzdWNoIHBvcnQgcmVnaXN0ZXJlZGBcbiAgICAgICAgICA6IGBUcmllZCB0byBzZW5kIG1lc3NhZ2UgdG8gXCIkeyB0byB9XCIgYnV0IHRoZSBwb3J0IHRvIGJhY2tncm91bmQgaXMgbm90IGF2YWlsYWJsZSB0byBzZW5kIHRocm91Z2hgXG4gICAgICApXG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSBnZXRSYW5kb21JZCgxXzAwMF8wMDApXG5cbiAgICBhd2FpdCB0aGlzLiNzZW5kTWVzc2FnZSh7XG4gICAgICBpZCxcbiAgICAgIHRvLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIG1lc3NhZ2VUeXBlOiAnZXZlbnQtc2VuZCcsXG4gICAgICBtZXNzYWdlUHJvcHM6IHsgZXZlbnQgfVxuICAgIH0pXG5cbiAgICBpZiAodGhpcy5wb3J0TGlzdC5pbmNsdWRlcyh0bykgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbm5lY3Rpb24gdG8gXCIkeyB0byB9XCIgd2FzIGNsb3NlZCB3aGlsZSB3YWl0aW5nIGZvciBhIHJlc3BvbnNlYClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5tZXNzYWdlTWFwWyBpZCBdID0ge1xuICAgICAgICBwb3J0TmFtZTogdG8sXG4gICAgICAgIHJlc29sdmU6IHJlc3BvbnNlUGF5bG9hZCA9PiB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMubWVzc2FnZU1hcFsgaWQgXVxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2VQYXlsb2FkKVxuICAgICAgICB9LFxuICAgICAgICByZWplY3Q6IGVyciA9PiB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMubWVzc2FnZU1hcFsgaWQgXVxuICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWVcbiAgICovXG4gIHNldERlYnVnICh2YWx1ZSkge1xuICAgIHRoaXMuI2RlYnVnID0gdmFsdWUgPT09IHRydWVcbiAgfVxuXG4gIGxvZyAoLi4uYXJncykge1xuICAgIGlmICh0aGlzLiNkZWJ1ZyAhPT0gdHJ1ZSB8fCBhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgICBjb25zdCBsYXN0QXJnID0gYXJnc1sgYXJncy5sZW5ndGggLSAxIF1cblxuICAgIGlmIChsYXN0QXJnICE9PSB2b2lkIDAgJiYgT2JqZWN0KGxhc3RBcmcpID09PSBsYXN0QXJnKSB7XG4gICAgICBjb25zdCBsb2cgPSBgJHsgdGhpcy4jYmFubmVyIH0gJHsgYXJncy5zbGljZSgwLCAtMSkuam9pbignICcpIH0gKGNsaWNrIHRvIGV4cGFuZClgXG4gICAgICBjb25zb2xlLmdyb3VwQ29sbGFwc2VkKGxvZylcbiAgICAgIGNvbnNvbGUuZGlyKGxhc3RBcmcpXG4gICAgICBjb25zb2xlLmdyb3VwRW5kKGxvZylcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLiNiYW5uZXIsIC4uLmFyZ3MpXG4gICAgfVxuICB9XG5cbiAgd2FybiAoLi4uYXJncykge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgICBjb25zdCBsYXN0QXJnID0gYXJnc1sgYXJncy5sZW5ndGggLSAxIF1cblxuICAgIGlmIChsYXN0QXJnICE9PSB2b2lkIDAgJiYgT2JqZWN0KGxhc3RBcmcpID09PSBsYXN0QXJnKSB7XG4gICAgICBjb25zb2xlLndhcm4odGhpcy4jYmFubmVyLCAuLi5hcmdzLnNsaWNlKDAsIC0xKSlcbiAgICAgIGNvbnN0IGdyb3VwID0gJ1RoZSBhYm92ZSB3YXJuaW5nIGRldGFpbHMgKGNsaWNrIHRvIGV4cGFuZCknXG4gICAgICBjb25zb2xlLmdyb3VwQ29sbGFwc2VkKGdyb3VwKVxuICAgICAgY29uc29sZS5kaXIobGFzdEFyZylcbiAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoZ3JvdXApXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKHRoaXMuI2Jhbm5lciwgLi4uYXJncylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdWxkIGJlIHVzZWQgb25seSBieSB0aGUgYmFja2dyb3VuZCBzY3JpcHRcbiAgICogQHBhcmFtIHt7IGFkZGVkPzogc3RyaW5nIH0gfCB7IHJlbW92ZWQ/OiBzdHJpbmcgfX0gcmVhc29uXG4gICAqL1xuICAjb25Qb3J0Q2hhbmdlIChyZWFzb24pIHtcbiAgICB0aGlzLnBvcnRMaXN0ID0gT2JqZWN0LmtleXModGhpcy5wb3J0TWFwKVxuICAgIGNvbnN0IGxpc3QgPSBbICdiYWNrZ3JvdW5kJywgLi4udGhpcy5wb3J0TGlzdCBdXG5cbiAgICBmb3IgKGNvbnN0IHBvcnROYW1lIG9mIHRoaXMucG9ydExpc3QpIHtcbiAgICAgIHRoaXMuc2VuZCh7XG4gICAgICAgIGV2ZW50OiAnQHF1YXNhcjpwb3J0cycsXG4gICAgICAgIHRvOiBwb3J0TmFtZSxcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIHBvcnRMaXN0OiBsaXN0LmZpbHRlcihuYW1lID0+IG5hbWUgIT09IHBvcnROYW1lKSxcbiAgICAgICAgICAuLi5yZWFzb25cbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgdGhpcy53YXJuKFxuICAgICAgICAgIGBGYWlsZWQgdG8gaW5mb3JtIFwiJHsgcG9ydE5hbWUgfVwiIGFib3V0IHRoZSBwb3J0IGxpc3QuYCxcbiAgICAgICAgICBlcnJcbiAgICAgICAgKVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtNZXNzYWdlfSBtZXNzYWdlXG4gICAqL1xuICBhc3luYyAjdHJpZ2dlck1lc3NhZ2VFdmVudCAobWVzc2FnZSkge1xuICAgIGNvbnN0IGxpc3QgPSB0aGlzLmxpc3RlbmVyc1sgbWVzc2FnZS5ldmVudCBdXG5cbiAgICBpZiAobGlzdCA9PT0gdm9pZCAwKSByZXR1cm5cblxuICAgIGNvbnN0IHBsdXJhbCA9IGxpc3QubGVuZ3RoID4gMSA/ICdzJyA6ICcnXG4gICAgdGhpcy5sb2coXG4gICAgICBgVHJpZ2dlcmluZyAkeyBsaXN0Lmxlbmd0aCB9IGxpc3RlbmVyJHsgcGx1cmFsIH0gZm9yIGV2ZW50OiBcIiR7IG1lc3NhZ2UuZXZlbnQgfVwiLmAsXG4gICAgICB7IG1lc3NhZ2UsIGxpc3RlbmVyczogbGlzdCB9XG4gICAgKVxuXG4gICAgbGV0IHJlc3BvbnNlUGF5bG9hZFxuICAgIGZvciAoY29uc3QgeyB0eXBlLCBjYWxsYmFjayB9IG9mIGxpc3Quc2xpY2UoMCkpIHtcbiAgICAgIGlmICh0eXBlID09PSAnb25jZScpIHtcbiAgICAgICAgdGhpcy5vZmYobWVzc2FnZS5ldmVudCwgY2FsbGJhY2spXG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChyZXNwb25zZVBheWxvYWQgPT09IHZvaWQgMCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gY2FsbGJhY2sobWVzc2FnZSlcbiAgICAgICAgICByZXNwb25zZVBheWxvYWQgPSB2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2VcbiAgICAgICAgICAgID8gYXdhaXQgdmFsdWVcbiAgICAgICAgICAgIDogdmFsdWVcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhtZXNzYWdlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICBgRXJyb3Igd2hpbGUgdHJpZ2dlcmluZyBsaXN0ZW5lciR7IHBsdXJhbCB9IGZvciBldmVudDogXCIkeyBtZXNzYWdlLmV2ZW50IH1cIi5gLFxuICAgICAgICAgIHsgZXJyb3I6IGVyciwgbWVzc2FnZSwgbGlzdGVuZXI6IHsgdHlwZSwgY2FsbGJhY2sgfSB9XG4gICAgICAgIClcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycilcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzcG9uc2VQYXlsb2FkXG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBvcnROYW1lXG4gICAqL1xuICAjY2xlYW51cFBvcnQgKHBvcnROYW1lKSB7XG4gICAgZm9yIChjb25zdCBpZCBpbiB0aGlzLmNodW5rTWFwKSB7XG4gICAgICBjb25zdCBwYWNrZXQgPSB0aGlzLmNodW5rTWFwWyBpZCBdXG4gICAgICBpZiAocGFja2V0LnBvcnROYW1lID09PSBwb3J0TmFtZSkge1xuICAgICAgICBkZWxldGUgdGhpcy5jaHVua01hcFsgaWQgXVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgaWQgaW4gdGhpcy5tZXNzYWdlTWFwKSB7XG4gICAgICBjb25zdCBwYWNrZXQgPSB0aGlzLm1lc3NhZ2VNYXBbIGlkIF1cbiAgICAgIGlmIChwYWNrZXQucG9ydE5hbWUgPT09IHBvcnROYW1lKSB7XG4gICAgICAgIHBhY2tldC5yZWplY3QoJ0Nvbm5lY3Rpb24gd2FzIGNsb3NlZCcpXG4gICAgICB9XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMucG9ydE1hcFsgcG9ydE5hbWUgXVxuICB9XG5cbiAgI29uUGFja2V0IChwYWNrZXQpIHtcbiAgICAvKipcbiAgICAgKiBpZiBpdCdzIG5vdCBhIHBhY2tldCBzZW50IGJ5IHRoaXMgYnJpZGdlXG4gICAgICogdGhlbiBpZ25vcmUgaXRcbiAgICAgKi9cbiAgICBpZiAoXG4gICAgICBPYmplY3QocGFja2V0KSAhPT0gcGFja2V0XG4gICAgICB8fCBwYWNrZXQuaWQgPT09IHZvaWQgMFxuICAgICAgfHwgcGFja2V0LmZyb20gPT09IHZvaWQgMFxuICAgICAgfHwgcGFja2V0LnRvID09PSB2b2lkIDBcbiAgICAgIHx8IHBhY2tldC50eXBlID09PSB2b2lkIDBcbiAgICApIHtcbiAgICAgIHRoaXMubG9nKFxuICAgICAgICAnUmVjZWl2ZWQgYSBtZXNzYWdlIHRoYXQgZG9lcyBub3QgYXBwZWFyIHRvIGJlIGVtaXR0ZWQgYnkgYSBRdWFzYXIgYnJpZGdlIG9yIGlzIG1hbGZvcm1lZC4nLFxuICAgICAgICBwYWNrZXRcbiAgICAgIClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMubG9nKFxuICAgICAgYFJlY2VpdmVkIG1lc3NhZ2Ugb2YgdHlwZSBcIiR7IHBhY2tldC50eXBlIH1cIiBmcm9tIFwiJHsgcGFja2V0LmZyb20gfVwiLmAsXG4gICAgICBwYWNrZXRcbiAgICApXG5cbiAgICAvKipcbiAgICAgKiBpZiB0aGUgcGFja2V0IGlzIG5vdCBhZGRyZXNzZWQgdG8gdGhpcyBicmlkZ2VcbiAgICAgKiB0aGVuIGZvcndhcmQgaXQgdG8gdGhlIHRhcmdldFxuICAgICAqL1xuICAgIGlmIChwYWNrZXQudG8gIT09IHRoaXMucG9ydE5hbWUpIHtcbiAgICAgIHRoaXMuI3NlbmRQYWNrZXQocGFja2V0KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgYEZhaWxlZCB0byBmb3J3YXJkIG1lc3NhZ2Ugb2YgdHlwZSBcIiR7IHBhY2tldC50eXBlIH1cIiBmcm9tIFwiJHsgcGFja2V0LmZyb20gfVwiIHRvIFwiJHsgcGFja2V0LnRvIH1cIi5gLFxuICAgICAgICAgIGVyclxuICAgICAgICApXG5cbiAgICAgICAgdGhpcy4jc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBwYWNrZXQuaWQsXG4gICAgICAgICAgdG86IHBhY2tldC5mcm9tLFxuICAgICAgICAgIG1lc3NhZ2VUeXBlOiAnZXZlbnQtcmVzcG9uc2UnLFxuICAgICAgICAgIG1lc3NhZ2VQcm9wczoge1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIHN0YWNrOiBlcnIuc3RhY2sgfHwgJ25vIHN0YWNrIGF2YWlsYWJsZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBxdWlldDogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAocGFja2V0LnR5cGUgPT09ICdmdWxsJykge1xuICAgICAgdGhpcy4jb25NZXNzYWdlKHtcbiAgICAgICAgaWQ6IHBhY2tldC5pZCxcbiAgICAgICAgZnJvbTogcGFja2V0LmZyb20sXG4gICAgICAgIHRvOiBwYWNrZXQudG8sXG4gICAgICAgIHBheWxvYWQ6IHBhY2tldC5wYXlsb2FkLFxuICAgICAgICB0eXBlOiBwYWNrZXQubWVzc2FnZVR5cGUsXG4gICAgICAgIHByb3BzOiBwYWNrZXQubWVzc2FnZVByb3BzXG4gICAgICB9KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHBhY2tldC50eXBlID09PSAnY2h1bmsnKSB7XG4gICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtNYXBbIHBhY2tldC5pZCBdXG5cbiAgICAgIGlmIChjaHVuayA9PT0gdm9pZCAwKSB7XG4gICAgICAgIGlmIChwYWNrZXQuY2h1bmtJbmRleCAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgdGhpcy53YXJuKFxuICAgICAgICAgICAgJ1JlY2VpdmVkIGFuIHVucmVnaXN0ZXJlZCBjaHVuay4nLFxuICAgICAgICAgICAgcGFja2V0XG4gICAgICAgICAgKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jaHVua01hcFsgcGFja2V0LmlkIF0gPSB7XG4gICAgICAgICAgcG9ydE5hbWU6IHBhY2tldC5mcm9tLFxuICAgICAgICAgIG51bWJlcjogcGFja2V0LmNodW5rc051bWJlcixcbiAgICAgICAgICBtZXNzYWdlVHlwZTogcGFja2V0Lm1lc3NhZ2VUeXBlLFxuICAgICAgICAgIG1lc3NhZ2VQcm9wczogcGFja2V0Lm1lc3NhZ2VQcm9wcyxcbiAgICAgICAgICBwYXlsb2FkOiBbXVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSByZWNlaXZlZCBhbiB1bmV4cGVjdGVkIGNodW5rXG4gICAgICBpZiAocGFja2V0LmNodW5rSW5kZXggIT09IGNodW5rLnBheWxvYWQubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICAnUmVjZWl2ZWQgYW4gb3V0IG9mIG9yZGVyIGNodW5rLicsXG4gICAgICAgICAgcGFja2V0XG4gICAgICAgIClcblxuICAgICAgICAvLyBmcmVlIHVwIHJlc291cmNlc1xuICAgICAgICBkZWxldGUgdGhpcy5jaHVua01hcFsgcGFja2V0LmlkIF1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGNodW5rLnBheWxvYWQucHVzaChwYWNrZXQucGF5bG9hZClcblxuICAgICAgLy8gaWYgd2UgcmVjZWl2ZWQgYWxsIGNodW5rcy4uLlxuICAgICAgaWYgKHBhY2tldC5jaHVua0luZGV4ID09PSBjaHVuay5udW1iZXIgLSAxKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNodW5rTWFwWyBwYWNrZXQuaWQgXVxuXG4gICAgICAgIHRoaXMuI29uTWVzc2FnZSh7XG4gICAgICAgICAgaWQ6IHBhY2tldC5pZCxcbiAgICAgICAgICBmcm9tOiBwYWNrZXQuZnJvbSxcbiAgICAgICAgICB0bzogcGFja2V0LnRvLFxuICAgICAgICAgIHBheWxvYWQ6IGNodW5rLnBheWxvYWQsXG4gICAgICAgICAgdHlwZTogY2h1bmsubWVzc2FnZVR5cGUsXG4gICAgICAgICAgcHJvcHM6IGNodW5rLm1lc3NhZ2VQcm9wc1xuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAocGFja2V0LnR5cGUgPT09ICdjaHVuay1hYm9ydCcpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmNodW5rTWFwWyBwYWNrZXQuaWQgXVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy53YXJuKFxuICAgICAgYFJlY2VpdmVkIGFuIHVua25vd24gbWVzc2FnZSB0eXBlOiBcIiR7IHBhY2tldC50eXBlIH1cIi5gXG4gICAgKVxuICB9XG5cbiAgI3NlbmRQYWNrZXQgKHBhY2tldCkge1xuICAgIHRoaXMubG9nKFxuICAgICAgcGFja2V0LmZyb20gPT09IHRoaXMucG9ydE5hbWVcbiAgICAgICAgPyBgU2VuZGluZyBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgdG8gXCIkeyBwYWNrZXQudG8gfVwiLmBcbiAgICAgICAgOiBgRm9yd2FyZGluZyBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgZnJvbSBcIiR7IHBhY2tldC5mcm9tIH1cIiB0byBcIiR7IHBhY2tldC50byB9XCIuYFxuICAgICAgLFxuICAgICAgcGFja2V0XG4gICAgKVxuXG4gICAgY29uc3QgcG9ydCA9IHRoaXMuI3R5cGUgPT09ICdiYWNrZ3JvdW5kJ1xuICAgICAgPyB0aGlzLnBvcnRNYXBbIHBhY2tldC50byBdXG4gICAgICA6IHRoaXMucG9ydE1hcC5iYWNrZ3JvdW5kXG5cbiAgICBpZiAodGhpcy5wb3J0TGlzdC5pbmNsdWRlcyhwYWNrZXQudG8pID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICBgVHJpZWQgdG8gc2VuZCBtZXNzYWdlIG9mIHR5cGUgXCIkeyBwYWNrZXQudHlwZSB9XCIgdG8gXCIkeyBwYWNrZXQudG8gfVwiIGJ1dCB0aGVyZSBpcyBubyBzdWNoIHBvcnQgcmVnaXN0ZXJlZGBcbiAgICAgIClcbiAgICB9XG5cbiAgICBpZiAocG9ydCA9PT0gdm9pZCAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXG4gICAgICAgIHRoaXMuI3R5cGUgPT09ICdiYWNrZ3JvdW5kJ1xuICAgICAgICAgID8gYFRyaWVkIHRvIHNlbmQgbWVzc2FnZSBvZiB0eXBlIFwiJHsgcGFja2V0LnR5cGUgfVwiIHRvIFwiJHsgcGFja2V0LnRvIH1cIiBidXQgdGhlIHBvcnQgaXMgbm90IGF2YWlsYWJsZWBcbiAgICAgICAgICA6IGBUcmllZCB0byBzZW5kIG1lc3NhZ2Ugb2YgdHlwZSBcIiR7IHBhY2tldC50eXBlIH1cIiB0byBcIiR7IHBhY2tldC50byB9XCIgYnV0IHRoZSBwb3J0IHRvIGJhY2tncm91bmQgaXMgbm90IGF2YWlsYWJsZSB0byBmb3J3YXJkIHRocm91Z2hgXG4gICAgICApXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHBvcnQucG9zdE1lc3NhZ2UocGFja2V0KVxuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLndhcm4oXG4gICAgICAgIGBGYWlsZWQgdG8gc2VuZCBtZXNzYWdlIHRvIFwiJHsgcGFja2V0LnRvIH1cIi5gLFxuICAgICAgICBlcnJcbiAgICAgIClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHt7IGlkPzogbnVtYmVyLCB0bzogc3RyaW5nLCBwYXlsb2FkOiBhbnksIG1lc3NhZ2VUeXBlOiBcImV2ZW50LXNlbmRcIiB8IFwiZXZlbnQtcmVzcG9uc2VcIiwgbWVzc2FnZVByb3BzOiBhbnkgfX0gcGFyYW1cbiAgICovXG4gICNzZW5kTWVzc2FnZSAoe1xuICAgIGlkID0gZ2V0UmFuZG9tSWQoMV8wMDBfMDAwKSxcbiAgICB0byxcbiAgICBwYXlsb2FkLFxuICAgIG1lc3NhZ2VUeXBlLFxuICAgIG1lc3NhZ2VQcm9wc1xuICB9KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF5bG9hZCkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy4jc2VuZFBhY2tldCh7XG4gICAgICAgIGlkLFxuICAgICAgICBmcm9tOiB0aGlzLnBvcnROYW1lLFxuICAgICAgICB0byxcbiAgICAgICAgdHlwZTogJ2Z1bGwnLFxuICAgICAgICBwYXlsb2FkLFxuICAgICAgICBtZXNzYWdlVHlwZSxcbiAgICAgICAgbWVzc2FnZVByb3BzXG4gICAgICB9KVxuICAgIH1cblxuICAgIGxldCBwcm9taXNlID0gdGhpcy4jc2VuZFBhY2tldCh7XG4gICAgICBpZCxcbiAgICAgIGZyb206IHRoaXMucG9ydE5hbWUsXG4gICAgICB0byxcbiAgICAgIHR5cGU6ICdjaHVuaycsXG4gICAgICBjaHVua3NOdW1iZXI6IHBheWxvYWQubGVuZ3RoLFxuICAgICAgbWVzc2FnZVR5cGUsXG4gICAgICBtZXNzYWdlUHJvcHNcbiAgICB9KVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXlsb2FkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IHRoaXMuI3NlbmRQYWNrZXQoe1xuICAgICAgICBpZCxcbiAgICAgICAgZnJvbTogdGhpcy5wb3J0TmFtZSxcbiAgICAgICAgdG8sXG4gICAgICAgIHR5cGU6ICdjaHVuaycsXG4gICAgICAgIHBheWxvYWQ6IHBheWxvYWRbIGkgXSxcbiAgICAgICAgY2h1bmtJbmRleDogaVxuICAgICAgfSkpXG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goZXJyID0+IHtcbiAgICAgIHRoaXMuI3NlbmRQYWNrZXQoe1xuICAgICAgICBpZCxcbiAgICAgICAgZnJvbTogdGhpcy5wb3J0TmFtZSxcbiAgICAgICAgdG8sXG4gICAgICAgIHR5cGU6ICdjaHVuay1hYm9ydCdcbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIHRoaXMud2FybihcbiAgICAgICAgICBgRmFpbGVkIHRvIHNlbmQgYSBjaHVuay1hYm9ydCBtZXNzYWdlIHRvIFwiJHsgdG8gfVwiLmAsXG4gICAgICAgICAgZXJyXG4gICAgICAgIClcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpXG4gICAgfSlcbiAgfVxuXG4gICNvbk1lc3NhZ2UgKG1lc3NhZ2UpIHtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSAnZXZlbnQtcmVzcG9uc2UnKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm1lc3NhZ2VNYXBbIG1lc3NhZ2UuaWQgXVxuXG4gICAgICBpZiAodGFyZ2V0ID09PSB2b2lkIDApIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UucHJvcHMucXVpZXQgIT09IHRydWUpIHtcbiAgICAgICAgICB0aGlzLndhcm4oXG4gICAgICAgICAgICBgUmVjZWl2ZWQgYSByZXNwb25zZSBmb3IgYW4gdW5rbm93biBtZXNzYWdlIGlkOiBcIiR7IG1lc3NhZ2UuaWQgfVwiLmAsXG4gICAgICAgICAgICBtZXNzYWdlXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS5wcm9wcy5lcnJvciAhPT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldC5yZWplY3QobWVzc2FnZS5wcm9wcy5lcnJvcilcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0YXJnZXQucmVzb2x2ZShtZXNzYWdlLnBheWxvYWQpXG4gICAgICB9XG5cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdldmVudC1zZW5kJykge1xuICAgICAgdGhpcy4jdHJpZ2dlck1lc3NhZ2VFdmVudCh7XG4gICAgICAgIGZyb206IG1lc3NhZ2UuZnJvbSxcbiAgICAgICAgdG86IG1lc3NhZ2UudG8sXG4gICAgICAgIGV2ZW50OiBtZXNzYWdlLnByb3BzLmV2ZW50LFxuICAgICAgICBwYXlsb2FkOiBtZXNzYWdlLnBheWxvYWRcbiAgICAgIH0pLnRoZW4ocmV0dXJuUGF5bG9hZCA9PiB7XG4gICAgICAgIHRoaXMuI3NlbmRNZXNzYWdlKHtcbiAgICAgICAgICBpZDogbWVzc2FnZS5pZCxcbiAgICAgICAgICB0bzogbWVzc2FnZS5mcm9tLFxuICAgICAgICAgIHBheWxvYWQ6IHJldHVyblBheWxvYWQsXG4gICAgICAgICAgbWVzc2FnZVR5cGU6ICdldmVudC1yZXNwb25zZScsXG4gICAgICAgICAgbWVzc2FnZVByb3BzOiB7fVxuICAgICAgICB9KVxuICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgdGhpcy4jc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgIGlkOiBtZXNzYWdlLmlkLFxuICAgICAgICAgIHRvOiBtZXNzYWdlLmZyb20sXG4gICAgICAgICAgbWVzc2FnZVR5cGU6ICdldmVudC1yZXNwb25zZScsXG4gICAgICAgICAgbWVzc2FnZVByb3BzOiB7XG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgICAgICAgICAgc3RhY2s6IGVyci5zdGFjayB8fCAnbm8gc3RhY2sgYXZhaWxhYmxlJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMud2FybihcbiAgICAgIGBSZWNlaXZlZCBhIG1lc3NhZ2Ugd2l0aCB1bmtub3duIHR5cGU6IFwiJHsgbWVzc2FnZS50eXBlIH1cIi5gLFxuICAgICAgbWVzc2FnZVxuICAgIClcbiAgfVxufVxuIiwgImltcG9ydCB7IEJleEJyaWRnZSB9IGZyb20gJy4vcHJpdmF0ZS9iZXgtYnJpZGdlLmpzJ1xuXG5mdW5jdGlvbiBpbnRlcmNlcHRSZXF1ZXN0cyAoZGV2U2VydmVyUG9ydCkge1xuICAvKipcbiAgICogV2UgaW50ZXJjZXB0IGFsbCBmZXRjaCByZXF1ZXN0cyBmcm9tIHRoZSBleHRlbnNpb24gcGFnZSBhbmQgcmVkaXJlY3QgdGhlbSB0byB0aGUgZGV2IHNlcnZlclxuICAgKiBmb3IgSE1SIHB1cnBvc2VzLlxuICAgKi9cblxuICBjb25zdCBiZXhPcmlnaW4gPSBgY2hyb21lLWV4dGVuc2lvbjovLyR7IGNocm9tZS5ydW50aW1lLmlkIH1gXG4gIGNvbnN0IGhyZWZSRSA9IC89JHw9KD89JikvZ1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGdldERldlNlcnZlclJlc3BvbnNlICh1cmwpIHtcbiAgICAvLyBwb2ludCBpdCB0byB0aGUgZGV2IHNlcnZlclxuICAgIHVybC5wcm90b2NvbCA9ICdodHRwOidcbiAgICB1cmwuaG9zdCA9ICdsb2NhbGhvc3QnXG4gICAgdXJsLnBvcnQgPSBkZXZTZXJ2ZXJQb3J0XG5cbiAgICAvLyBlbnN1cmUgd2UgaGF2ZSBhIGZyZXNoIHZlcnNpb24gb2YgdGhlIHJlc3BvbnNlXG4gICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3QnLCBEYXRlLm5vdygpKVxuXG4gICAgLy8gZmV0Y2ggdGhlIHJlcXVlc3RlZCByZXNvdXJjZVxuICAgIGNvbnN0IHJlcXVlc3QgPSBhd2FpdCBmZXRjaChcbiAgICAgIHVybC5ocmVmLnJlcGxhY2UoaHJlZlJFLCAnJylcbiAgICApXG5cbiAgICAvLyBhbmQgcmV0dXJuIGl0IHdyYXBwZWQgYXMgaWYgaXQgY29tZXMgZnJvbSB0aGUgZXh0ZW5zaW9uXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShyZXF1ZXN0LmJvZHksIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6IHJlcXVlc3QuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpIHx8ICd0ZXh0L2phdmFzY3JpcHQnLFxuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6IHJlcXVlc3QuaGVhZGVycy5nZXQoJ0NhY2hlLUNvbnRyb2wnKSB8fCAnJ1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2ZldGNoJywgZXZ0ID0+IHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKGV2dC5yZXF1ZXN0LnVybClcblxuICAgIGlmICh1cmwub3JpZ2luID09PSBiZXhPcmlnaW4pIHtcbiAgICAgIGV2dC5yZXNwb25kV2l0aChcbiAgICAgICAgZ2V0RGV2U2VydmVyUmVzcG9uc2UodXJsKVxuICAgICAgKVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gY29ubmVjdFRvRGV2U2VydmVyIChkZXZTZXJ2ZXJQb3J0LCB3c1Rva2VuKSB7XG4gIGNvbnN0IHBpbmdVcmwgPSBgaHR0cDovL2xvY2FsaG9zdDokeyBkZXZTZXJ2ZXJQb3J0IH0vX192aXRlX3BpbmdgXG4gIGNvbnN0IHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoYHdzOi8vbG9jYWxob3N0OiR7IGRldlNlcnZlclBvcnQgfT90b2tlbj0keyB3c1Rva2VuIH1gLCAndml0ZS1obXInKVxuXG4gIGNvbnN0IGNvbnRlbnRTY3JpcHRQb3J0TGlzdCA9IG5ldyBTZXQoKVxuICBjb25zdCBjb250ZW50U2NyaXB0UG9ydE5hbWVSRSA9IC9ecXVhc2FyQGhtclxcL2NvbnRlbnQtc2NyaXB0XFwvL1xuXG4gIGZ1bmN0aW9uIHJlbG9hZEV4dGVuc2lvbiAoKSB7XG4gICAgY29uc3QgbGVuID0gY29udGVudFNjcmlwdFBvcnRMaXN0LnNpemVcbiAgICBjb25zdCBzdWZmaXggPSBsZW4gIT09IDBcbiAgICAgID8gYCBhbG9uZyB3aXRoICR7IGxlbiB9IGNvbnRlbnQgc2NyaXB0JHsgbGVuID4gMSA/ICdzJyA6ICcnIH1gXG4gICAgICA6ICcnXG5cbiAgICBjb25zb2xlLmxvZyhgW1FCZXh8SE1SXSBSZWxvYWRpbmcgZXh0ZW5zaW9uJHsgc3VmZml4IH0uLi5gKVxuXG4gICAgZm9yIChjb25zdCBwb3J0IG9mIGNvbnRlbnRTY3JpcHRQb3J0TGlzdCkge1xuICAgICAgcG9ydC5wb3N0TWVzc2FnZSgncWJleDpobXI6cmVsb2FkLWNvbnRlbnQnKVxuICAgIH1cblxuICAgIGNocm9tZS5ydW50aW1lLnJlbG9hZCgpXG4gIH1cblxuICAvLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKHsgZGF0YSB9KSA9PiB7XG4gICAgY29uc3QgeyB0eXBlLCBldmVudCB9ID0gSlNPTi5wYXJzZShkYXRhKVxuXG4gICAgaWYgKHR5cGUgPT09ICdjb25uZWN0ZWQnKSB7XG4gICAgICBjb25zb2xlLmxvZygnW1FCZXh8SE1SXSBDb25uZWN0ZWQnKVxuICAgICAgLy8gc2VuZCBhIHBpbmcgZXZlcnkgMzBzIHRvIGtlZXAgdGhlIGNvbm5lY3Rpb24gYWxpdmVcbiAgICAgIGNvbnN0IGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4gc29ja2V0LnNlbmQoJ3BpbmcnKSwgMzAwMDApXG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoKSA9PiBjbGVhckludGVydmFsKGludGVydmFsKSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAnY3VzdG9tJyAmJiBldmVudCA9PT0gJ3FiZXg6aG1yOnJlbG9hZCcpIHtcbiAgICAgIHJlbG9hZEV4dGVuc2lvbigpXG4gICAgfVxuICB9KVxuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGFzeW5jICh7IHdhc0NsZWFuIH0pID0+IHtcbiAgICBpZiAod2FzQ2xlYW4pIHJldHVyblxuICAgIGNvbnNvbGUubG9nKCdbUUJleHxITVJdIExvc3QgY29ubmVjdGlvbi4gUmVjb25uZWN0aW5nLi4uJylcblxuICAgIGxldCB0cmllcyA9IDFcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHRyaWVzID4gMjAwMCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbUUJleHxITVJdIEFib3J0aW5nIHJlLWNvbm5lY3QgYWZ0ZXIgMjAwMCBmYWlsZWQgYXR0ZW1wdHMuIFBsZWFzZSBtYW51YWxseSByZWxvYWQgdGhlIGV4dGVuc2lvbi4nKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgZmV0Y2gocGluZ1VybClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhdGNoIChfKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbUUJleHxITVJdIENvdWxkIG5vdCByZS1jb25uZWN0LiBSZXRyeWluZy4uLicpXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKVxuICAgICAgICB0cmllcysrXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVsb2FkRXh0ZW5zaW9uKClcbiAgfSlcblxuICBjaHJvbWUucnVudGltZS5vbkNvbm5lY3QuYWRkTGlzdGVuZXIocG9ydCA9PiB7XG4gICAgY29uc3QgeyBuYW1lIH0gPSBwb3J0XG5cbiAgICBpZiAoY29udGVudFNjcmlwdFBvcnROYW1lUkUudGVzdChuYW1lKSA9PT0gdHJ1ZSkge1xuICAgICAgY29udGVudFNjcmlwdFBvcnRMaXN0LmFkZChwb3J0KVxuXG4gICAgICBwb3J0Lm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICAgIGNvbnRlbnRTY3JpcHRQb3J0TGlzdC5kZWxldGUocG9ydClcbiAgICAgIH0pXG5cbiAgICAgIHBvcnQucG9zdE1lc3NhZ2UoJ3FiZXg6aG1yOmhlbGxvJylcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogT25seSBydW4gdGhlc2UgaW4gZGV2ZWxvcG1lbnQgbW9kZSBhbmQgaW4gYSBiYWNrZ3JvdW5kIHNlcnZpY2Ugd29ya2VyLlxuICogQ3VycmVudGx5IG9ubHkgQ2hyb21lIHN1cHBvcnRzIHRoaXMuXG4gKi9cbmlmIChwcm9jZXNzLmVudi5ERVYgPT09IHRydWUgJiYgcHJvY2Vzcy5lbnYuVEFSR0VUID09PSAnY2hyb21lJykge1xuICBjb25zdCBkZXZTZXJ2ZXJQb3J0ID0gcHJvY2Vzcy5lbnYuX19RVUFTQVJfQkVYX1NFUlZFUl9QT1JUX19cbiAgY29uc3Qgd3NUb2tlbiA9IHByb2Nlc3MuZW52Ll9fUVVBU0FSX0JFWF9XU19UT0tFTl9fXG5cbiAgaW50ZXJjZXB0UmVxdWVzdHMoZGV2U2VydmVyUG9ydClcbiAgY29ubmVjdFRvRGV2U2VydmVyKGRldlNlcnZlclBvcnQsIHdzVG9rZW4pXG59XG5cbmxldCBzY3JpcHRIYXNCcmlkZ2UgPSBmYWxzZVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQnJpZGdlICh7IGRlYnVnIH0gPSB7fSkge1xuICBpZiAoc2NyaXB0SGFzQnJpZGdlID09PSB0cnVlKSB7XG4gICAgY29uc29sZS5lcnJvcignQmFja2dyb3VuZCBRdWFzYXIgQnJpZGdlIGhhcyBhbHJlYWR5IGJlZW4gY3JlYXRlZC4nKVxuICAgIHJldHVyblxuICB9XG5cbiAgc2NyaXB0SGFzQnJpZGdlID0gdHJ1ZVxuXG4gIHJldHVybiBuZXcgQmV4QnJpZGdlKHtcbiAgICB0eXBlOiAnYmFja2dyb3VuZCcsXG4gICAgZGVidWdcbiAgfSlcbn1cbiIsICIvKipcbiAqIEltcG9ydGluZyB0aGUgZmlsZSBiZWxvdyBpbml0aWFsaXplcyB0aGUgZXh0ZW5zaW9uIGJhY2tncm91bmQuXG4gKlxuICogV2FybmluZ3M6XG4gKiAxLiBEbyBub3QgcmVtb3ZlIHRoZSBpbXBvcnQgc3RhdGVtZW50IGJlbG93LiBJdCBpcyByZXF1aXJlZCBmb3IgdGhlIGV4dGVuc2lvbiB0byB3b3JrLlxuICogICAgSWYgeW91IGRvbid0IG5lZWQgY3JlYXRlQnJpZGdlKCksIGxlYXZlIGl0IGFzIFwiaW1wb3J0ICcjcS1hcHAvYmV4L2JhY2tncm91bmQnXCIuXG4gKiAyLiBEbyBub3QgaW1wb3J0IHRoaXMgZmlsZSBpbiBtdWx0aXBsZSBiYWNrZ3JvdW5kIHNjcmlwdHMuIE9ubHkgb25jZSFcbiAqIDMuIEltcG9ydCBpdCBpbiB5b3VyIGJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgKGlmIGF2YWlsYWJsZSBmb3IgeW91ciB0YXJnZXQgYnJvd3NlcikuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUJyaWRnZSB9IGZyb20gJyNxLWFwcC9iZXgvYmFja2dyb3VuZCdcblxuZnVuY3Rpb24gb3BlbkV4dGVuc2lvbiAoKSB7XG4gIGNocm9tZS50YWJzLmNyZWF0ZShcbiAgICB7XG4gICAgICB1cmw6IGNocm9tZS5ydW50aW1lLmdldFVSTCgnd3d3L2luZGV4Lmh0bWwnKVxuICAgIH0sXG4gICAgKC8qIG5ld1RhYiAqLykgPT4ge1xuICAgICAgLy8gVGFiIG9wZW5lZC5cbiAgICB9XG4gIClcbn1cblxuLyoqXG4vLyBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcihvcGVuRXh0ZW5zaW9uKVxuLy8gY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIob3BlbkV4dGVuc2lvbilcbiAqL1xuXG5cbmNocm9tZS5hY3Rpb24ub25DbGlja2VkLmFkZExpc3RlbmVyKGFzeW5jICh0YWIpID0+IHtcbiAgYXdhaXQgY2hyb21lLnNpZGVQYW5lbC5vcGVuKHsgd2luZG93SWQ6IHRhYi53aW5kb3dJZCB9KTtcbn0pO1xuXG5jaHJvbWUuc2lkZVBhbmVsLnNldE9wdGlvbnMoe1xuICBwYXRoOiAnd3d3L2luZGV4Lmh0bWwnLFxuICBlbmFibGVkOiB0cnVlXG59KTtcblxuLyoqXG4gKiBDYWxsIHVzZUJyaWRnZSgpIHRvIGVuYWJsZSBjb21tdW5pY2F0aW9uIHdpdGggdGhlIGFwcCAmIGNvbnRlbnQgc2NyaXB0c1xuICogKGFuZCBiZXR3ZWVuIHRoZSBhcHAgJiBjb250ZW50IHNjcmlwdHMpLCBvdGhlcndpc2Ugc2tpcCBjYWxsaW5nXG4gKiB1c2VCcmlkZ2UoKSBhbmQgdXNlIG5vIGJyaWRnZS5cbiAqL1xuY29uc3QgYnJpZGdlID0gY3JlYXRlQnJpZGdlKHsgZGVidWc6IGZhbHNlIH0pXG5cbmJyaWRnZS5vbignbG9nJywgKHsgZnJvbSwgcGF5bG9hZCB9KSA9PiB7XG4gIGNvbnNvbGUubG9nKGBbQkVYXSBAbG9nIGZyb20gXCIkeyBmcm9tIH1cImAsIHBheWxvYWQpXG59KVxuXG5icmlkZ2Uub24oJ2dldFRpbWUnLCAoKSA9PiB7XG4gIHJldHVybiBEYXRlLm5vdygpXG59KVxuXG5icmlkZ2Uub24oJ3N0b3JhZ2UuZ2V0JywgKHsgcGF5bG9hZCB9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICBpZiAocGF5bG9hZCA9PT0gdm9pZCAwKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQobnVsbCwgaXRlbXMgPT4ge1xuICAgICAgICAvLyBHcm91cCB0aGUgdmFsdWVzIHVwIGludG8gYW4gYXJyYXkgdG8gdGFrZSBhZHZhbnRhZ2Ugb2YgdGhlIGJyaWRnZSdzIGNodW5rIHNwbGl0dGluZy5cbiAgICAgICAgcmVzb2x2ZShPYmplY3QudmFsdWVzKGl0ZW1zKSlcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbcGF5bG9hZF0sIGl0ZW1zID0+IHtcbiAgICAgICAgcmVzb2x2ZShpdGVtc1twYXlsb2FkXSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufSlcbi8vIFVzYWdlOlxuLy8gYnJpZGdlLnNlbmQoe1xuLy8gICBldmVudDogJ3N0b3JhZ2UuZ2V0Jyxcbi8vICAgdG86ICdiYWNrZ3JvdW5kJyxcbi8vICAgcGF5bG9hZDoga2V5XG4vLyB9KS50aGVuKHJlc3BvbnNlUGF5bG9hZCA9PiB7IC4uLiB9KS5jYXRjaChlcnIgPT4geyAuLi4gfSlcblxuYnJpZGdlLm9uKCdzdG9yYWdlLnNldCcsIGFzeW5jICh7IHBheWxvYWQgfSkgPT4ge1xuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbcGF5bG9hZC5rZXldOiBwYXlsb2FkLnZhbHVlIH0pXG59KVxuLy8gVXNhZ2U6XG4vLyBicmlkZ2Uuc2VuZCh7XG4vLyAgIGV2ZW50OiAnc3RvcmFnZS5zZXQnLFxuLy8gICB0bzogJ2JhY2tncm91bmQnLFxuLy8gICBwYXlsb2FkOiB7IGtleTogJ3NvbWVLZXknLCB2YWx1ZTogJ3NvbWVWYWx1ZScgfVxuLy8gfSkudGhlbihyZXNwb25zZVBheWxvYWQgPT4geyAuLi4gfSkuY2F0Y2goZXJyID0+IHsgLi4uIH0pXG5cbmJyaWRnZS5vbignc3RvcmFnZS5yZW1vdmUnLCBhc3luYyAoeyBwYXlsb2FkIH0pID0+IHtcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKHBheWxvYWQpXG59KVxuLy8gVXNhZ2U6XG4vLyBicmlkZ2Uuc2VuZCh7XG4vLyAgIGV2ZW50OiAnc3RvcmFnZS5yZW1vdmUnLFxuLy8gICB0bzogJ2JhY2tncm91bmQnLFxuLy8gICBwYXlsb2FkOiAnc29tZUtleSdcbi8vIH0pLnRoZW4ocmVzcG9uc2VQYXlsb2FkID0+IHsgLi4uIH0pLmNhdGNoKGVyciA9PiB7IC4uLiB9KVxuXG4vKlxuLy8gTW9yZSBleGFtcGxlczpcblxuLy8gTGlzdGVuIHRvIGEgbWVzc2FnZSBmcm9tIHRoZSBjbGllbnRcbmJyaWRnZS5vbigndGVzdCcsIG1lc3NhZ2UgPT4ge1xuICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICBjb25zb2xlLmxvZyhtZXNzYWdlLnBheWxvYWQpXG59KVxuXG4vLyBTZW5kIGEgbWVzc2FnZSBhbmQgc3BsaXQgcGF5bG9hZCBpbnRvIGNodW5rc1xuLy8gdG8gYXZvaWQgbWF4IHNpemUgbGltaXQgb2YgQkVYIG1lc3NhZ2VzLlxuLy8gV2FybmluZyEgVGhpcyBoYXBwZW5zIGF1dG9tYXRpY2FsbHkgd2hlbiB0aGUgcGF5bG9hZCBpcyBhbiBhcnJheS5cbi8vIElmIHlvdSBhY3R1YWxseSB3YW50IHRvIHNlbmQgYW4gQXJyYXksIHdyYXAgaXQgaW4gYW4gT2JqZWN0LlxuYnJpZGdlLnNlbmQoe1xuICBldmVudDogJ3Rlc3QnLFxuICB0bzogJ2FwcCcsXG4gIHBheWxvYWQ6IFsgJ2NodW5rMScsICdjaHVuazInLCAnY2h1bmszJywgLi4uIF1cbn0pLnRoZW4ocmVzcG9uc2VQYXlsb2FkID0+IHsgLi4uIH0pLmNhdGNoKGVyciA9PiB7IC4uLiB9KVxuXG4vLyBTZW5kIGEgbWVzc2FnZSBhbmQgd2FpdCBmb3IgYSByZXNwb25zZVxuYnJpZGdlLnNlbmQoe1xuICBldmVudDogJ3Rlc3QnLFxuICB0bzogJ2FwcCcsXG4gIHBheWxvYWQ6IHsgYmFubmVyOiAnSGVsbG8gZnJvbSBiYWNrZ3JvdW5kIScgfVxufSkudGhlbihyZXNwb25zZVBheWxvYWQgPT4geyAuLi4gfSkuY2F0Y2goZXJyID0+IHsgLi4uIH0pXG5cbi8vIExpc3RlbiB0byBhIG1lc3NhZ2UgZnJvbSB0aGUgY2xpZW50IGFuZCByZXNwb25kIHN5bmNocm9ub3VzbHlcbmJyaWRnZS5vbigndGVzdCcsIG1lc3NhZ2UgPT4ge1xuICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICByZXR1cm4geyBiYW5uZXI6ICdIZWxsbyBmcm9tIGJhY2tncm91bmQhJyB9XG59KVxuXG4vLyBMaXN0ZW4gdG8gYSBtZXNzYWdlIGZyb20gdGhlIGNsaWVudCBhbmQgcmVzcG9uZCBhc3luY2hyb25vdXNseVxuYnJpZGdlLm9uKCd0ZXN0JywgYXN5bmMgbWVzc2FnZSA9PiB7XG4gIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNvbWVBc3luY0Z1bmN0aW9uKClcbiAgcmV0dXJuIHJlc3VsdFxufSlcbmJyaWRnZS5vbigndGVzdCcsIG1lc3NhZ2UgPT4ge1xuICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByZXNvbHZlKHsgYmFubmVyOiAnSGVsbG8gZnJvbSBiYWNrZ3JvdW5kIScgfSlcbiAgICB9LCAxMDAwKVxuICB9KVxufSlcblxuLy8gQnJvYWRjYXN0IGEgbWVzc2FnZSB0byBhcHAgJiBjb250ZW50IHNjcmlwdHNcbmJyaWRnZS5wb3J0TGlzdC5mb3JFYWNoKHBvcnROYW1lID0+IHtcbiAgYnJpZGdlLnNlbmQoeyBldmVudDogJ3Rlc3QnLCB0bzogcG9ydE5hbWUsIHBheWxvYWQ6ICdIZWxsbyBmcm9tIGJhY2tncm91bmQhJyB9KVxufSlcblxuLy8gRmluZCBhbnkgY29ubmVjdGVkIGNvbnRlbnQgc2NyaXB0IGFuZCBzZW5kIGEgbWVzc2FnZSB0byBpdFxuY29uc3QgY29udGVudFBvcnQgPSBicmlkZ2UucG9ydExpc3QuZmluZChwb3J0TmFtZSA9PiBwb3J0TmFtZS5zdGFydHNXaXRoKCdjb250ZW50QCcpKVxuaWYgKGNvbnRlbnRQb3J0KSB7XG4gIGJyaWRnZS5zZW5kKHsgZXZlbnQ6ICd0ZXN0JywgdG86IGNvbnRlbnRQb3J0LCBwYXlsb2FkOiAnSGVsbG8gZnJvbSBiYWNrZ3JvdW5kIScgfSlcbn1cblxuLy8gU2VuZCBhIG1lc3NhZ2UgdG8gYSBjZXJ0YWluIGNvbnRlbnQgc2NyaXB0XG5icmlkZ2VcbiAgLnNlbmQoeyBldmVudDogJ3Rlc3QnLCB0bzogJ2NvbnRlbnRAbXktY29udGVudC1zY3JpcHQtMjM0NScsIHBheWxvYWQ6ICdIZWxsbyBmcm9tIGJhY2tncm91bmQhJyB9KVxuICAudGhlbihyZXNwb25zZVBheWxvYWQgPT4geyAuLi4gfSlcbiAgLmNhdGNoKGVyciA9PiB7IC4uLiB9KVxuXG4vLyBMaXN0ZW4gZm9yIGNvbm5lY3Rpb24gZXZlbnRzXG4vLyAodGhlIFwiQHF1YXNhcjpwb3J0c1wiIGlzIGFuIGludGVybmFsIGV2ZW50IG5hbWUgcmVnaXN0ZXJlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoZSBicmlkZ2UpXG4vLyAtLT4gKHsgcG9ydExpc3Q6IHN0cmluZ1tdLCBhZGRlZD86IHN0cmluZyB9IHwgeyBwb3J0TGlzdDogc3RyaW5nW10sIHJlbW92ZWQ/OiBzdHJpbmcgfSlcbmJyaWRnZS5vbignQHF1YXNhcjpwb3J0cycsICh7IHBvcnRMaXN0LCBhZGRlZCwgcmVtb3ZlZCB9KSA9PiB7XG4gIGNvbnNvbGUubG9nKCdQb3J0czonLCBwb3J0TGlzdClcbiAgaWYgKGFkZGVkKSB7XG4gICAgY29uc29sZS5sb2coJ05ldyBjb25uZWN0aW9uOicsIGFkZGVkKVxuICB9XG4gIGVsc2UgaWYgKHJlbW92ZWQpIHtcbiAgICBjb25zb2xlLmxvZygnQ29ubmVjdGlvbiByZW1vdmVkOicsIHJlbW92ZWQpXG4gIH1cbn0pXG5cbi8vIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBjbGllbnQgYmFzZWQgb24gc29tZXRoaW5nIGhhcHBlbmluZy5cbmNocm9tZS50YWJzLm9uQ3JlYXRlZC5hZGRMaXN0ZW5lcih0YWIgPT4ge1xuICBicmlkZ2Uuc2VuZCguLi4pLnRoZW4ocmVzcG9uc2VQYXlsb2FkID0+IHsgLi4uIH0pLmNhdGNoKGVyciA9PiB7IC4uLiB9KVxufSlcblxuLy8gU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIGNsaWVudCBiYXNlZCBvbiBzb21ldGhpbmcgaGFwcGVuaW5nLlxuY2hyb21lLnRhYnMub25VcGRhdGVkLmFkZExpc3RlbmVyKCh0YWJJZCwgY2hhbmdlSW5mbywgdGFiKSA9PiB7XG4gIGlmIChjaGFuZ2VJbmZvLnVybCkge1xuICAgIGJyaWRnZS5zZW5kKC4uLikudGhlbihyZXNwb25zZVBheWxvYWQgPT4geyAuLi4gfSkuY2F0Y2goZXJyID0+IHsgLi4uIH0pXG4gIH1cbn0pXG5cbi8vIER5bmFtaWNhbGx5IHNldCBkZWJ1ZyBtb2RlXG5icmlkZ2Uuc2V0RGVidWcodHJ1ZSkgLy8gYm9vbGVhblxuXG4vLyBMb2cgYSBtZXNzYWdlIG9uIHRoZSBjb25zb2xlIChpZiBkZWJ1ZyBpcyBlbmFibGVkKVxuYnJpZGdlLmxvZygnSGVsbG8gd29ybGQhJylcbmJyaWRnZS5sb2coJ0hlbGxvJywgJ3dvcmxkIScpXG5icmlkZ2UubG9nKCdIZWxsbyB3b3JsZCEnLCB7IHNvbWU6ICdkYXRhJyB9KVxuYnJpZGdlLmxvZygnSGVsbG8nLCAnd29ybGQnLCAnIScsIHsgc29tZTogJ29iamVjdCcgfSlcbi8vIExvZyBhIHdhcm5pbmcgb24gdGhlIGNvbnNvbGUgKHJlZ2FyZGxlc3Mgb2YgdGhlIGRlYnVnIHNldHRpbmcpXG5icmlkZ2Uud2FybignSGVsbG8gd29ybGQhJylcbmJyaWRnZS53YXJuKCdIZWxsbycsICd3b3JsZCEnKVxuYnJpZGdlLndhcm4oJ0hlbGxvIHdvcmxkIScsIHsgc29tZTogJ2RhdGEnIH0pXG5icmlkZ2Uud2FybignSGVsbG8nLCAnd29ybGQnLCAnIScsIHsgc29tZTogJ29iamVjdCcgfSlcbiovXG5cbmJyaWRnZS5vbignc2V0TG9jYXRpb24nLCBhc3luYyAoeyBwYXlsb2FkIH0pID0+IHtcbiAgY29uc29sZS5sb2coJ1tCRVhdIHNldExvY2F0aW9uIHJlY2VpdmVkJywgcGF5bG9hZClcbiAgY29uc29sZS5sb2coXCJbQkVYXSBwb3J0IGxpc3RcIiwgYnJpZGdlLnBvcnRMaXN0KVxuXG4gIC8vIEZvcndhcmQgdG8gYW55IGNvbm5lY3RlZCBjb250ZW50IHNjcmlwdHNcbiAgZm9yIChjb25zdCBwb3J0TmFtZSBvZiBicmlkZ2UucG9ydExpc3QpIHtcbiAgICBpZiAocG9ydE5hbWUuc3RhcnRzV2l0aCgnY29udGVudEAnKSkge1xuICAgICAgY29uc29sZS5sb2coXCJbQkVYXSBzZW5kIHBheWxvYWQgdG8gYnJpZGUgcG9ydFwiLCBwb3J0TmFtZSlcbiAgICAgIGJyaWRnZS5zZW5kKHtcbiAgICAgICAgZXZlbnQ6ICd0ZXN0JyxcbiAgICAgICAgdG86IHBvcnROYW1lLFxuICAgICAgICBwYXlsb2FkOiB7IHNlbGVjdGVkOiBwYXlsb2FkIH1cbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLy8gQWNrbm93bGVkZ2UgYmFjayB0byB0aGUgYXBwXG4gIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfVxufSkiXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sYUFBYTtBQUNuQixNQUFNLEVBQUUsUUFBUSxJQUFJLFFBQW1DLFVBQVU7QUFNakUsV0FBUyxZQUFhLEtBQUs7QUFDekIsV0FBTyxLQUFLLE1BQU0sS0FBSyxPQUFPLElBQUksR0FBRztBQUFBLEVBQ3ZDO0FBVEE7QUFtQk8sTUFBTSxZQUFOLE1BQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUE0QnJCLFlBQWEsRUFBRSxNQUFNLE9BQU8sSUFBSSxNQUFNLEdBQUc7QUE1QnBDO0FBR0w7QUFBQTtBQUFBLHNDQUFXO0FBRVg7QUFBQSx5Q0FBYztBQUVkO0FBQUEsdUNBQVksQ0FBQztBQUViO0FBQUEscUNBQVUsQ0FBQztBQUVYO0FBQUEsc0NBQVcsQ0FBQztBQUVaO0FBQUEsd0NBQWEsQ0FBQztBQUVkO0FBQUEsc0NBQVcsQ0FBQztBQUlaO0FBQUE7QUFBQTtBQUVBO0FBQUEsaUNBQVM7QUFFVDtBQUFBO0FBTUUsV0FBSyxXQUFXO0FBQ2hCLHlCQUFLLE9BQVE7QUFFYixVQUFJLFNBQVMsV0FBVztBQU90QixhQUFLLFdBQVcsR0FBSSxJQUFLLElBQUssSUFBSyxJQUFLLFlBQVksR0FBTSxDQUFFO0FBQUEsTUFD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
