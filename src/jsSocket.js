/*
 * $Id$
 */

var jsSocket;
var jsSSLSocket;

(function() {
     var charBuffer = function() {
         var buffer = '';

         return {
             length: buffer.length,
             get: function(len) {
                 var data, datalen;

                 len = len || 1;
                 datalen = (buffer.length > len) ? len : buffer.length;
                 data = buffer.slice(0, datalen);
                 buffer = buffer.slice(datalen);
                 this.length = buffer.length;
                 return data;
             },
             put: function(buf, len) {
                 buffer = buffer.concat(buf);
                 this.length = buffer.length;
             },
             clear: function() {
                 buffer = '';
                 this.length = buffer.length;
             }
         };
     };

     function makeSocket(scheme, type) {
         var sock, _jsSocket, rbuf, wbuf;

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
             _jsSocket.onmessage && _jsSocket.onmessage(_jsSocket);
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
             if (sock.bufferedAmount == 0) {
                 sock.send(wbuf.get(wbuf.length));
                 wbuf.clear();
             } else {
                 setTimeout(doSend, 50, false);
             }
         }

         if (type === 'binary') {
             ; // make ArrayBuffer
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
              * @param [len] data length
              */
             send: function(buf, len) {
                 wbuf.put(buf, len);
                 doSend();
             },
             /**
              * receive data
              * @memberOf _jsSocket.prototype
              * @param len data length
              * @return data
              */
             recv: function(len) {
                 return rbuf.get(len);
             },
             /**
              * connect to a server
              * @memberOf _jsSocket.prototype
              * @param {json} args
              * @param {string} args.host FQDN or IPAddr
              * @param {Number} [args.port] port number
              * @param {string} args.path path
              */
             connect: function(args) {
                 var url = makeURL(args);

                 try {
                     sock = new WebSocket(url);
                 } catch (x) {
                     onerror(x);
                     return;
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
