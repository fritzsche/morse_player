const button = document.querySelector('button');
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

button.onclick = function () {
    play(audioCtx);
}

let test_text = "vvv<ka> CQ CQ CQ DE DJ1TF PSE K = <sk>"

const code_map = [
    [/a/i, '.-'],
    [/b/i, '-...'],
    [/\s+/i, ' '],  // whitespace is trimmed to single char
    [/./i, '']  // ignore all unknown char
]

conv_to_morse("ab ca");

function conv_to_morse(str) {
    let offset = 0;
    var result = [];
    for (; ;) {
        let length = 0;
        let pattern = "";
        for (let i = 0; i < code_map.length; i++) {
            let reg = code_map[i][0];
            found = str.substr(offset).match(reg);
            if (found && found.index == 0) {

                pattern = code_map[i][1];
                length = found.length;
                break;
            }
        }
        if (pattern != '') {
            if (pattern == ' ') result.push({ pattern: pattern })
              else result.push({ pattern: pattern, offset: offset, length: length });
            console.log( pattern );
        }
        
            offset += length;
        if (offset === str.length) break;
      //  debugger;
//        break;
    }
    console.log(result);
    console.log("end");
}

function play(ctx) {
    let freq = 700;
    let rt = 50;
    let ft = 50;
    let myArrayBuffer = ctx.createBuffer(2, ctx.sampleRate * 1, ctx.sampleRate);


    for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
        // This gives us the actual ArrayBuffer that contains the data
        let nowBuffering = myArrayBuffer.getChannelData(channel);
        for (let i = 0; i < myArrayBuffer.length; i++) {
            nowBuffering[i] = Math.sin(2 * Math.PI * freq * i / ctx.sampleRate);
            if (i < rt) {
                nowBuffering[i] *= Math.pow(Math.sin(Math.PI * i / (2 * rt)), 2);
            }
            if (i > myArrayBuffer.length - ft) {
                nowBuffering[i] *= Math.pow((Math.sin(2 * Math.PI * (i - (myArrayBuffer.length - ft) + ft) / (4 * ft))), 2);
            }
        }
    }
    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    let source = ctx.createBufferSource();
    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;
    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(ctx.destination);
    // start the source playing
    source.start();
}