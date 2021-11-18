let i = 0;

class Ms2109Quirks extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const inputChannel = input[0];
    for (let i = 0; i < inputChannel.length / 2; i++) {
      const left = inputChannel[i * 2];
      const right = inputChannel[i * 2 + 1];
      output[0][i * 2] = output[0][i * 2 + 1] = left;
      output[1][i * 2] = output[1][i * 2 + 1] = right;
    }
    return true
  }
}

registerProcessor('ms2109-quirks', Ms2109Quirks);