/*
 * $Id$
 */

var jsSocket;
var jsSSLSocket;

(function() {
     var charBuffer = function() {
         var buffer = '';

         return {
             length: 0,
             get: function(len) {
                 var data, datalen;

                 if (this.length == 0 || len == 0) {
                     return undefined;
                 }
                 datalen = (buffer.length > len) ? len : buffer.length;
                 data = buffer.slice(0, datalen);
                 buffer = buffer.slice(datalen);
                 this.length = buffer.length;
                 return data;
             },
             put: function(buf) {
                 buffer = buffer.concat(buf);
                 this.length = buffer.length;
             },
             clear: function() {
                 buffer = '';
                 this.length = buffer.length;
             }
         };
     };

     var arrayBuffer = function() {
         var buffer;

         return {
             length: 0,
             get: function(len) {
                 var data, datalen;

                 if (!buffer || this.length == 0 || len == 0) {
                     return undefined;
                 }
                 datalen = (this.length > len) ? len : this.length;
                 data = buffer.subarray(0, datalen);
                 buffer = buffer.subarray(datalen);
                 this.length = buffer.length;
                 if (buffer.length == 0) {
                     buffer = undefined;
                 }
                 return data;
             },
             put: function(buf) {
                 var tmp, u8a = new Uint8Array(buf);

                 if (!buffer) {
                     buffer = u8a;
                 } else {
                     tmp = new Uint8Array(this.length + u8a.length);
                     tmp.set(buffer);
                     tmp.set(u8a, this.length);
                     buffer = tmp;
                 }
                 this.length = buffer.length;
             },
             clear: function() {
                 buffer = undefined;
                 this.length = 0;
             }
         };
     };

     function makeSocket(scheme, type) {
         var sock, _jsSocket, rbuf, wbuf, callbacked = false;

         function makeURL(args) {
             var host, port, path, url;

             if (args && args.host && args.host.length > 0) {
                 host = args.host;
             } else {
                 host = location.hostname;
             }
             if (host.match(/:/g)) {
                 host = host.match(/^\[.*\]$/) ? host : '[' + host + ']';
             }
             if (args && args.port) {
                 port = parseInt(args.port, 10);
             } else {
                 port = parseInt(location.port) ||
                     (scheme.match(/wss:/) ? 443 : 80);
             }
             path = (args && args.path) ? args.path : '';
             path = path.match(/^\//) ? path : '/' + path;
             if ((scheme.match(/ws:/) && port == 80) ||
                 (scheme.match(/wss:/) && port == 443)) {
                 url = scheme + '//' + host + path;
             } else {
                 url = scheme + '//' + host + ':' + port + path;
             }
             return url;
         }

         function onopen(e) {
             _jsSocket.onopen && _jsSocket.onopen(_jsSocket);
         }

         function onmessage(e) {
             rbuf.put(e.data);
             if (_jsSocket.onmessage && !callbacked) {
                 callbacked = true;
                 _jsSocket.onmessage(_jsSocket);
             }
         }

         function onerror(e) {
             rbuf.clear();
             wbuf.clear();
             sock && sock.close();
             sock && delete sock;
             _jsSocket.onerror && _jsSocket.onerror(e);
         }

         function onclose(e) {
             rbuf.clear();
             wbuf.clear();
             sock && delete sock;
             _jsSocket.onclose && _jsSocket.onclose(e);
         }

         function doSend() {
             var buf;

             if (sock.bufferedAmount == 0) {
                 buf = wbuf.get(wbuf.length);
                 if (!buf) {
                     return;
                 }
                 if (typeof buf === 'string') {
                     sock.send(buf);
                 } else { // arrayBuffer
                     sock.send(buf.buffer);
                 }
             } else {
                 setTimeout(doSend, 50);
             }
         }

         if (type === 'binary') {
             rbuf = new arrayBuffer();
             wbuf = new arrayBuffer();
         } else {
             rbuf = new charBuffer();
             wbuf = new charBuffer();
         }
         /**
          * base Class for Socket and SSL Socket
          * @namespace
          */
         _jsSocket = {
             /**
              * send data
              * @memberOf _jsSocket.prototype
              * @param buf data to send
              */
             send: function(buf) {
                 wbuf.put(buf);
                 doSend();
             },
             /**
              * receive data
              * @memberOf _jsSocket.prototype
              * @param len data length
              * @return {undefined || string || Uint8Array} data
              * <p>
              * returns 'string' when sock type === 'text'<br>
              * returns 'Uint8Array' Object when sock type === 'binary'
              */
             recv: function(len) {
                 var d;

                 d = rbuf.get(len);
                 if (rbuf.length > 0) {
                     setTimeout(function() {
                                    _jsSocket.onmessage &&
                                    _jsSocket.onmessage(_jsSocket);
                                }, 0);
                 } else {
                     callbacked = false;
                 }
                 return d;
             },
             /**
              * connect to a server
              * @memberOf _jsSocket.prototype
              * @param {json} args
              * @param {string} [args.host] FQDN or IPAddr<br>
              * used location.hostname by default
              * @param {Number} [args.port] port number<br>
              * used location.port by default
              * @param {string} args.path path
              */
             connect: function(args) {
                 var url = makeURL(args);

                 try {
                     if (window.WebSocket) {
                         sock = new WebSocket(url);
                     } else if (window.MozWebSocket) {
                         sock = new MozWebSocket(url);
                     }
                 } catch (x) {
                     onerror(x);
                     return;
                 }
                 if (type === 'binary') {
                     sock.binaryType = 'arraybuffer';
                 }
                 sock.onopen = onopen;
                 sock.onmessage = onmessage;
                 sock.onerror = onerror;
                 sock.onclose = onclose;
             },
             /**
              * disconnect from a server
              * @memberOf _jsSocket.prototype
              */
             disconnect: function() {
                 sock && sock.close();
             }
             /**
              * fire when connected a server
              * @name _jsSocket#onopen
              * @event
              * @param {Event} e Event object
              */
             /**
              * fire when received message from a server
              * or messages exist in read queue
              * @name _jsSocket#onmessage
              * @event
              * @param {MessageEvent} e MessageEvent object
              */
             /**
              * fire when occured an error
              * @name _jsSocket#onerror
              * @event
              * @param {Error} e Error object
              */
             /**
              * fire when disconnected from a server
              * @name _jsSocket#onclose
              * @event
              * @param {CloseEvent} e CloseEvent object
              */
         };
         return _jsSocket;
     }
     /**
      * Socket Class
      * @constructor
      * @augments _jsSocket
      * @param {string} [type] 'text' or 'binary'<br>
      * 'text' as default
      */
     jsSocket = jsSocket ||
         function(type) {
             return makeSocket('ws:', type);
         };
     /**
      * SSL Socket Class
      * @constructor
      * @augments _jsSocket
      * @param {string} [type] 'text' or 'binary'<br>
      * 'text' as default
      */
     jsSSLSocket = jsSSLSocket || 
         function(type) {
             return makeSocket('wss:', type);
         };
 })();

/* EOF */
