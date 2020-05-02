
const code_map = [
    [/<ka>/, '-.-.-'],
    [/<sk>/, '...-.-'],
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
    constructor(ctx, cpm = 100, freq = 600) {
        console.log("Begin Constr")
        this._ctx = ctx;
        this._cpm = cpm;
        this._freq = freq;
        this._ditLen = this._ditLength(cpm);
        this._ditBuffer = this._createBuffer(this._ditLen);
        this._dahBuffer = this._createBuffer(this._ditLen * 3);
        console.log("End Contr");
    }
    morse(txt) {
        console.log("BEgin morse")
        let conv = this._conv_to_morse(txt);
        let current = this._ctx.currentTime;
        conv.forEach(letter => {
            switch (letter.pattern) {
                case ' ':
                    current += this._ditLen * 7;
                    break;
                case '*':
                    current += this._ditLen * 3;
                    break;
                default:
                    let word = letter.pattern.split("").join("*");
                    [...word].forEach(tone => {
                        switch (tone) {
                            case '.':
                                this._playBuffer(this._ditBuffer,current);
                                current += this._ditLen;
                                break;
                            case '-': 
                                this._playBuffer(this._dahBuffer,current);
                                current += this._ditLen*3;
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
        console.log("end morse")
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
                    result.push({ pattern: pattern, offset: offset, length: length });
                    last_is_char = true;
                }

            }
            offset += length;
            if (offset === low_str.length) break;
        }
        return(result);
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


const button = document.querySelector('button');

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
audioCtx.resume().then(function() {
    let m = new Morse(audioCtx);
    m.morse("vvv<ka>")    
  });  



button.onclick = function () {
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume().then(function() {
        let m = new Morse(audioCtx);
        m.morse("vvv<ka> CQ CQ CQ DE DJ1TF PSE K = <sk>")    
      });     
}