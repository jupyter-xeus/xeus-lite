// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { expose } from 'comlink';

import {
  DriveFS,
  DriveFSEmscriptenNodeOps,
  IEmscriptenFSNode,
  IStats
} from '@jupyterlite/contents';

declare function createXeusModule(options: any): any;

globalThis.Module = {};

const WASM_KERNEL_FILE = XEUS_KERNEL_FILE;
const DATA_FILE = LANGUAGE_DATA_FILE;

// Workaround for ERRNO_CODES not being set, this can happen with Emscripten
const DEFAULT_ERRNO_CODES = {
  E2BIG: 1,
  EACCES: 2,
  EADDRINUSE: 3,
  EADDRNOTAVAIL: 4,
  EADV: 122,
  EAFNOSUPPORT: 5,
  EAGAIN: 6,
  EALREADY: 7,
  EBADE: 113,
  EBADF: 8,
  EBADFD: 127,
  EBADMSG: 9,
  EBADR: 114,
  EBADRQC: 103,
  EBADSLT: 102,
  EBFONT: 101,
  EBUSY: 10,
  ECANCELED: 11,
  ECHILD: 12,
  ECHRNG: 106,
  ECOMM: 124,
  ECONNABORTED: 13,
  ECONNREFUSED: 14,
  ECONNRESET: 15,
  EDEADLK: 16,
  EDEADLOCK: 16,
  EDESTADDRREQ: 17,
  EDOM: 18,
  EDOTDOT: 125,
  EDQUOT: 19,
  EEXIST: 20,
  EFAULT: 21,
  EFBIG: 22,
  EHOSTDOWN: 142,
  EHOSTUNREACH: 23,
  EIDRM: 24,
  EILSEQ: 25,
  EINPROGRESS: 26,
  EINTR: 27,
  EINVAL: 28,
  EIO: 29,
  EISCONN: 30,
  EISDIR: 31,
  EL2HLT: 112,
  EL2NSYNC: 156,
  EL3HLT: 107,
  EL3RST: 108,
  ELIBACC: 129,
  ELIBBAD: 130,
  ELIBEXEC: 133,
  ELIBMAX: 132,
  ELIBSCN: 131,
  ELNRNG: 109,
  ELOOP: 32,
  EMFILE: 33,
  EMLINK: 34,
  EMSGSIZE: 35,
  EMULTIHOP: 36,
  ENAMETOOLONG: 37,
  ENETDOWN: 38,
  ENETRESET: 39,
  ENETUNREACH: 40,
  ENFILE: 41,
  ENOANO: 104,
  ENOBUFS: 42,
  ENOCSI: 111,
  ENODATA: 116,
  ENODEV: 43,
  ENOENT: 44,
  ENOEXEC: 45,
  ENOLCK: 46,
  ENOLINK: 47,
  ENOMEDIUM: 148,
  ENOMEM: 48,
  ENOMSG: 49,
  ENONET: 119,
  ENOPKG: 120,
  ENOPROTOOPT: 50,
  ENOSPC: 51,
  ENOSR: 118,
  ENOSTR: 100,
  ENOSYS: 52,
  ENOTBLK: 105,
  ENOTCONN: 53,
  ENOTDIR: 54,
  ENOTEMPTY: 55,
  ENOTRECOVERABLE: 56,
  ENOTSOCK: 57,
  ENOTSUP: 138,
  ENOTTY: 59,
  ENOTUNIQ: 126,
  ENXIO: 60,
  EOPNOTSUPP: 138,
  EOVERFLOW: 61,
  EOWNERDEAD: 62,
  EPERM: 63,
  EPFNOSUPPORT: 139,
  EPIPE: 64,
  EPROTO: 65,
  EPROTONOSUPPORT: 66,
  EPROTOTYPE: 67,
  ERANGE: 68,
  EREMCHG: 128,
  EREMOTE: 121,
  EROFS: 69,
  ESHUTDOWN: 140,
  ESOCKTNOSUPPORT: 137,
  ESPIPE: 70,
  ESRCH: 71,
  ESRMNT: 123,
  ESTALE: 72,
  ESTRPIPE: 135,
  ETIME: 117,
  ETIMEDOUT: 73,
  ETOOMANYREFS: 141,
  ETXTBSY: 74,
  EUNATCH: 110,
  EUSERS: 136,
  EWOULDBLOCK: 6,
  EXDEV: 75,
  EXFULL: 115
};


// TODO Remove this. This is to ensure we always perform node ops on Nodes and
// not Streams, but why is it needed??? Why do we get Streams and not Nodes from
// emscripten in the case of xeus-python???
class StreamNodeOps extends DriveFSEmscriptenNodeOps {
  private getNode(nodeOrStream: any) {
    if (nodeOrStream['node']) {
      return nodeOrStream['node'];
    }
    return nodeOrStream;
  }

  lookup(parent: IEmscriptenFSNode, name: string): IEmscriptenFSNode {
    return super.lookup(this.getNode(parent), name);
  }

  getattr(node: IEmscriptenFSNode): IStats {
    return super.getattr(this.getNode(node));
  }

  setattr(node: IEmscriptenFSNode, attr: IStats): void {
    super.setattr(this.getNode(node), attr);
  }

  mknod(
    parent: IEmscriptenFSNode,
    name: string,
    mode: number,
    dev: any
  ): IEmscriptenFSNode {
    return super.mknod(this.getNode(parent), name, mode, dev);
  }

  rename(
    oldNode: IEmscriptenFSNode,
    newDir: IEmscriptenFSNode,
    newName: string
  ): void {
    super.rename(this.getNode(oldNode), this.getNode(newDir), newName);
  }

  rmdir(parent: IEmscriptenFSNode, name: string): void {
    super.rmdir(this.getNode(parent), name);
  }

  readdir(node: IEmscriptenFSNode): string[] {
    return super.readdir(this.getNode(node));
  }
}

// TODO Remove this when we don't need StreamNodeOps anymore
class LoggingDrive extends DriveFS {
  constructor(options: DriveFS.IOptions) {
    super(options);

    this.node_ops = new StreamNodeOps(this);
  }
}

// when a toplevel cell uses an await, the cell is implicitly
// wrapped in a async function. Since the webloop - eventloop
// implementation does not support `eventloop.run_until_complete(f)`
// we need to convert the toplevel future in a javascript Promise
// this `toplevel` promise is then awaited before we
// execute the next cell. After the promise is awaited we need
// to do some cleanup and delete the python proxy
// (ie a js-wrapped python object) to avoid memory leaks
globalThis.toplevel_promise = null;
globalThis.toplevel_promise_py_proxy = null;

let resolveInputReply: any;

async function get_stdin() {
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  return replyPromise;
}

(self as any).get_stdin = get_stdin;

class XeusKernel {
  constructor() {
    this._ready = new Promise(resolve => {
      this.initialize(resolve);
    });
  }

  async ready(): Promise<void> {
    return await this._ready;
  }

  mount(driveName: string, mountpoint: string, baseUrl: string): void {
    const { FS, PATH, ERRNO_CODES } = globalThis.Module;

    if (!FS) {
      return;
    }

    if (!Object.keys(ERRNO_CODES).length) {
      ERRNO_CODES = DEFAULT_ERRNO_CODES;
    }

    this._drive = new LoggingDrive({
      FS,
      PATH,
      ERRNO_CODES,
      baseUrl,
      driveName,
      mountpoint
    });

    FS.mkdir(mountpoint);
    FS.mount(this._drive, {}, mountpoint);
    FS.chdir(mountpoint);
  }

  cd(path: string) {
    if (!path || !globalThis.Module.FS) {
      return;
    }

    globalThis.Module.FS.chdir(path);
  }

  async processMessage(event: any): Promise<void> {
    await this._ready;

    if (
      globalThis.toplevel_promise !== null &&
      globalThis.toplevel_promise_py_proxy !== null
    ) {
      await globalThis.toplevel_promise;
      globalThis.toplevel_promise_py_proxy.delete();
      globalThis.toplevel_promise_py_proxy = null;
      globalThis.toplevel_promise = null;
    }

    const msg_type = event.msg.header.msg_type;

    if (msg_type === 'input_reply') {
      resolveInputReply(event.msg);
    } else {
      this._raw_xserver.notify_listener(event.msg);
    }
  }

  private async initialize(resolve: () => void) {
    importScripts(WASM_KERNEL_FILE);

    globalThis.Module = await createXeusModule({});

    if (DATA_FILE.length !== 0) {
      importScripts(DATA_FILE);
      await this.waitRunDependency();
    }

    this._raw_xkernel = new globalThis.Module.xkernel();
    this._raw_xserver = this._raw_xkernel.get_server();

    if (!this._raw_xkernel) {
      console.error('Failed to start kernel!');
    }

    this._raw_xkernel.start();

    resolve();
  }

  private async waitRunDependency() {
    const promise = new Promise<void>(resolve => {
      globalThis.Module.monitorRunDependencies = (n: number) => {
        if (n === 0) {
          resolve();
        }
      };
    });
    // If there are no pending dependencies left, monitorRunDependencies will
    // never be called. Since we can't check the number of dependencies,
    // manually trigger a call.
    globalThis.Module.addRunDependency('dummy');
    globalThis.Module.removeRunDependency('dummy');
    return promise;
  }

  private _raw_xkernel: any;
  private _raw_xserver: any;
  private _drive: DriveFS | null = null;
  private _ready: PromiseLike<void>;
}

expose(new XeusKernel());
