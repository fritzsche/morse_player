

const button = document.querySelector('button');

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

button.onclick = function() {
    play(audioCtx);
}    

function play(ctx) {
    let freq = 700;
    let rt = 50;
    let ft = 50;
    let myArrayBuffer = ctx.createBuffer(2, ctx.sampleRate * 1, ctx.sampleRate);

    // Fill the buffer with white noise;
    //just random values between -1.0 and 1.0
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