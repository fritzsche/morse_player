
const code_map = [
    [/<ka>/, '-.-.-'],  // Message begins / Start of work 
    [/<sk>/, '...-.-'], //  End of contact / End of work
    [/<ar>/, '.-.-.'],  // End of transmission / End of message
    [/<kn>/, '-.--.'], // Go ahead, specific named station.
    [/=/, '-...-'],
    [/a/, '.-'],
    [/b/, '-...'],
    [/c/, '-.-.'],
    [/d/, '-..'],
    [/e/, '.'],
    [/f/, '..-.'],
    [/g/, '--.'],
    [/h/, '....'],
    [/i/, '..'],
    [/j/, '.---'],
    [/k/, '-.-'],
    [/l/, '.-..'],
    [/m/, '--'],
    [/n/, '-.'],
    [/o/, '---'],
    [/p/, '.--.'],
    [/q/, '--.-'],
    [/r/, '.-.'],
    [/s/, '...'],
    [/t/, '-'],
    [/u/, '..-'],
    [/v/, '...-'],
    [/w/, '.--'],
    [/x/, '-..-'],
    [/y/, '-.--'],
    [/z/, '--..'],
    [/1/, '.----'],
    [/2/, '..---'],
    [/3/, '...--'],
    [/4/, '....-'],
    [/5/, '.....'],
    [/6/, '-....'],
    [/7/, '--...'],
    [/8/, '---..'],
    [/9/, '----.'],
    [/0/, '-----'],
    [/'/, '.-.-.-'],
    [/,/, '--..--'],
    [/\?/, '..--..'],
    [/'/, '.----.'],
    [/\//, '-..-.'],
    [/\s+/, ' '],  // whitespace is trimmed to single char
    [/./, '']  // ignore all unknown char
];


class Morse {
    constructor(ctx, cpm = 100, freq = 650, farnsworth = 999) {

        this._ctx = ctx;
        this._cpm = cpm;
        this._freq = freq;
        this._farnsworth = farnsworth < cpm ? farnsworth : cpm;
        this._ditLen = this._ditLength(cpm);

        this._runId = 0;

        this._spaceDitLen = this._ditLength(this._farnsworth);
        this._ditBuffer = this._createBuffer(this._ditLen);
        this._dahBuffer = this._createBuffer(this._ditLen * 3);

    }

    morse(txt, callback) {
        if (audioCtx.state !== 'running') {
            audioCtx.resume().then(() => this._morse(txt, callback));
        } else this._morse(txt, callback);
    }

    stop() {
        this._runId++;
    }

    // https://github.com/cwilso/metronome/
    // https://www.html5rocks.com/en/tutorials/audio/scheduling/

    _morse(txt, callback) {
        let conv = this._conv_to_morse(txt);
        let seq = this._seqenceEvents(conv);
        this._morsePlay(seq, callback);
    }

    _morsePlay(seq, callback) {
        let start = this._ctx.currentTime;
        let ahead = this._ditLen * 4;

        this._runId++;
        let currRun = this._runId;


        let scheduled = () => {
            if (currRun !== this._runId) return;
            let current = this._ctx.currentTime;
            let delta = current - start;
            for (; ;) {
                if (seq.length === 0) break;
                let ev = seq.shift();
                if (ev.time < delta + ahead) {
                    switch (ev.action) {
                        case 'PLAY': {
                            switch (ev.tone) {
                                case '.': {
                                    this._playBuffer(this._ditBuffer, start + ev.time);
                                    break;
                                }
                                case '_': {
                                    this._playBuffer(this._dahBuffer, start + ev.time);
                                    break;
                                }
                            }
                            break;
                        }
                        case 'DISPLAY': {
                            let milis = (ev.time - (current - start)) * 1000;

                            setTimeout(() => {
                                if (callback) callback(ev.value);
                            }, milis);
                        }
                    }
                } else {
                    seq.unshift(ev);
                    break;
                }
            }
            if (seq.length > 0) setTimeout(scheduled, (ahead * 1000) / 3);
        }
        scheduled();
    }

    _seqenceEvents(conv) {
        let seq = [];
        let current = 0;

        conv.forEach(letter => {
            switch (letter.pattern) {
                case ' ':
                    seq.push({ time: current, action: 'DISPLAY', value: ' ' });
                    current += this._spaceDitLen * 7;

                    break;
                case '*':
                    current += this._spaceDitLen * 3;
                    break;
                default:
                    let word = letter.pattern.split("").join("*");
                    seq.push({ time: current, action: 'DISPLAY', value: letter.text });
                    [...word].forEach(tone => {
                        switch (tone) {
                            case '.':
                                seq.push({ time: current, action: 'PLAY', tone: '.' });
                                current += this._ditLen;
                                break;
                            case '-':
                                seq.push({ time: current, action: 'PLAY', tone: '_' });
                                current += this._ditLen * 3;
                            case '*':
                                current += this._ditLen;
                                break;
                            default:
                                debugger;
                        }
                    });
                    break;
            }
        });
        return seq;
    }

    _createBuffer(len) {
        let rt = 50;
        let ft = 50;
        let myArrayBuffer = this._ctx.createBuffer(2, this._ctx.sampleRate * len, this._ctx.sampleRate);

        for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
            // This gives us the actual ArrayBuffer that contains the data
            let nowBuffering = myArrayBuffer.getChannelData(channel);
            for (let i = 0; i < myArrayBuffer.length; i++) {
                nowBuffering[i] = Math.sin(2 * Math.PI * this._freq * i / this._ctx.sampleRate);
                if (i < rt) {
                    nowBuffering[i] *= Math.pow(Math.sin(Math.PI * i / (2 * rt)), 2);
                }
                if (i > myArrayBuffer.length - ft) {
                    nowBuffering[i] *= Math.pow((Math.sin(2 * Math.PI * (i - (myArrayBuffer.length - ft) + ft) / (4 * ft))), 2);
                }
            }
        }
        return myArrayBuffer;
    }
    _playBuffer(buf, start = 0) {
        let source = this._ctx.createBufferSource();
        source.buffer = buf;
        source.connect(this._ctx.destination);
        source.start(start);
    }
    _conv_to_morse(str) {
        let low_str = str.toLowerCase();
        let offset = 0;
        let last_is_char = false;
        var result = [];
        for (; ;) {
            let length = 0;
            let pattern = "";
            for (let i = 0; i < code_map.length; i++) {
                let reg = code_map[i][0];
                let found = low_str.substr(offset).match(reg);
                if (found && found.index == 0) {
                    pattern = code_map[i][1];
                    length = found[0].length;
                    break;
                }
            }
            if (pattern != '') {
                if (pattern == ' ') {
                    result.push({ pattern: pattern })
                    last_is_char = false;
                }
                else {
                    if (last_is_char) result.push({ pattern: '*' });
                    result.push({ pattern: pattern, offset: offset, length: length, text: low_str.substr(offset, length) });
                    last_is_char = true;
                }

            }
            offset += length;
            if (offset === low_str.length) break;
        }
        return (result);
    }

    _ditLength(cpm) {
        // The standard word "PARIS" has 50 units of time. 
        // .--.  .-  .-.  ..  ... ==> "PARIS"
        // 10 dit + 4 dah + 9 dit space + 4 dah space = 19 dit + 24 dit = 43 dit.
        // 43 dit + 7 dit between words results in 50 dits total time
        //
        // 100cpm (character per minute) 
        // means we need to give 20 times to word "PARIS".
        // means we give 20 times 50 units of time = 1000 units of time per minute (or 60 seconds).
        // 60 seconds devided by 1000 unit of time, means each unit (dit) takes 60ms.
        // Means at  speed of 100 cpm  a dit has 60ms length
        // length of one dit in s = ( 60ms * 100 ) / 1000        
        const cpmDitSpeed = (60 * 100) / 1000;
        return cpmDitSpeed / cpm;
    }
}
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/*
let start = Date.now();
audioCtx.resume().then(() => {
    const millis = Date.now() - start;
    if (millis < 200) {
        let m = new Morse(audioCtx, 100, 650, 60);
        m.morse("vvv<ka>");
    }
});
*/

let isRunning = false;
let m;
const button = document.querySelector('button');
button.onclick = function () {
/*    if (isRunning) {
        m.stop();
        isRunning = false;
    } else {
     */   
        isRunning = true;
        let morseTxt = document.getElementById("txt").value;
        let wpm = document.getElementById("wpm").value;
        let fw = document.getElementById("fw").value;
        let freq = document.getElementById("freq").value;
        m = new Morse(audioCtx, wpm * 5, freq, fw * 5);


        let currentOut = '';
        const out = document.getElementById("out");
        m.morse(morseTxt, (txt) => {

            currentOut += txt;
          //  out.value = currentOut;
            out.textContent = currentOut;
            out.scrollTop = out.scrollHeight;
            //        all.textContent = currentOut;
        })
 //   }
}