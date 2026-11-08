import net from 'node:net';
import {syncBuiltinESMExports} from 'node:module';
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){let v=args[0];if(Array.isArray(v))v=v[0];const host=typeof v==='object'?v.host??v.hostname:typeof args[1]==='string'?args[1]:undefined;if(host&&!['localhost','127.0.0.1','::1','[::1]'].includes(host))throw new Error('COMPARISON_LOOPBACK_ONLY');return Reflect.apply(connect,this,args);};
syncBuiltinESMExports();
