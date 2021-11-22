import ModuleInit from "./quirks-core.mjs";

const Module = new ModuleInit();

const CHUNK_LENGTH = 128;
const BUFFER_LENGTH = CHUNK_LENGTH * 4;

class Ms2109Quirks extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inPtr = Module._malloc(BUFFER_LENGTH);
    this.outPtr = Module._malloc(BUFFER_LENGTH * 2);
    this.inPtrIndex = this.inPtr / 4;
    this.outLeftIndex = this.outPtr / 4;
    this.outRightIndex = this.outPtr / 4 + CHUNK_LENGTH;
    this.outLeftLength = this.outLeftIndex + CHUNK_LENGTH;
    this.outRightLength = this.outRightIndex + CHUNK_LENGTH;
  }

  /**
   * 
   * @param {Array<Float32Array[]>} inputs 
   * @param {Array<Float32Array[]>} outputs 
   * @param {*} parameters 
   * @returns 
   */
  process([input], [output], parameters) {
    const inputChannel = input[0];
    Module.HEAPF32.set(inputChannel, this.inPtrIndex);
    Module._process(this.inPtr, this.outPtr, CHUNK_LENGTH);
    output[0].set(Module.HEAPF32.subarray(this.outLeftIndex, this.outLeftLength));
    output[1].set(Module.HEAPF32.subarray(this.outRightIndex, this.outRightLength));
    return true
  }
}

registerProcessor('ms2109-quirks', Ms2109Quirks);