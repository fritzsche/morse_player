const code_map = [
    [/<ka>/, '-.-.-'], // Message begins / Start of work 
    [/<sk>/, '...-.-'], //  End of contact / End of work
    [/<ar>/, '.-.-.'], // End of transmission / End of message
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
    [/\./, '.-.-.-'],
    [/ä/, '.--.-'],
    [/ö/, '---.'],
    [/ü/, '..--'],
    [/ß/, '...--..'],
    [/\!/, '-.-.--'],
    [/\s+/, ' '], // whitespace is trimmed to single char
    [/./, ''] // ignore all unknown char
];


class Morse {
    constructor(ctx, wpm = 20, freq = 650, farnsworth = 999) {


        this._ctx = ctx; // web audio context

        this._gain = this._ctx.createGain()
        this._gain.connect(this._ctx.destination)
        //        const clip_vol = 1.8 * Math.exp(-0.115 * 12 )
        this._gain.gain.value = 0.5 * 0.5 * 0.6

        this._lpf = this._ctx.createBiquadFilter()
        this._lpf.type = "lowpass"
        this._lpf.frequency.setValueAtTime(freq, this._ctx.currentTime)
        this._lpf.Q.setValueAtTime(12, this._ctx.currentTime)
        this._lpf.connect(this._gain)

        this._cwGain = this._ctx.createGain()
        this._cwGain.gain.value = 0
        this._cwGain.connect(this._lpf)

        this._oscillator = this._ctx.createOscillator()
        this._oscillator.type = 'sine'
        this._oscillator.frequency.setValueAtTime(freq, this._ctx.currentTime)
        this._oscillator.connect(this._cwGain)
        this._oscillator.start()

        this._runId = 0;
        this._currPos = 0;
        this._state = 'INITIAL'

        this._wpm = Number(wpm);
        this._ditLen = this._ditLength(wpm * 5)
        this._farnsworth = Number(farnsworth)
        if (this._farnsworth > this._wpm) this._farnsworth = this._wpm
        this._spaceDitLen = this._ditLength(this._farnsworth * 5)

        this.frequency = freq

    }

    set wpm(w) {
        if (this._wpm === Number(w)) return
        this._wpm = Number(w)
        this._ditLen = this._ditLength(this._wpm * 5)
        if (this._farnsworth > this._wpm) this._farnsworth = this._wpm
        this._spaceDitLen = this._ditLength(this._farnsworth * 5)
        if (this._state !== 'INITIAL') {
            this._seqence = this._seqenceEvents(this._conv_to_morse(this._text));
            this._startTime = this._ctx.currentTime - this._seqence[this._currPos].time;
        }
    }

    set farnsworth(f) {
        if (this._farnsworth === f) return;
        this._farnsworth = Number(f);
        if (this._farnsworth > this._wpm) this._farnsworth = this._wpm;
        this._spaceDitLen = this._ditLength(this._farnsworth * 5);
        // need to recalc sequence
        if (this._state !== 'INITIAL') {
            this._seqence = this._seqenceEvents(this._conv_to_morse(this._text));
            this.startTime = this._ctx.currentTime - this._seqence[this._currPos].time;
        }
    }


    set text(txt) {
        if (this._text === txt) return;
        this._text = txt;
        this._currPos = 0;
        this._seqence = this._seqenceEvents(this._conv_to_morse(txt));
    }

    set displayCallback(callback) {
        this._displayCallback = callback;
    }


    set frequency(freq = 650) {
        this._freq = freq;

        this._lpf.frequency.setValueAtTime(freq, this._ctx.currentTime)
        this._oscillator.frequency.setValueAtTime(freq, this._ctx.currentTime)
    }


    get state() {
        return this._state;
    }

    start() {
        if (audioCtx.state !== 'running') {
            audioCtx.resume().then(() => this._morsePlay());
        } else this._morsePlay();
    }
    stop() {
        this._runId++
        this._state = 'STOPPED'
        this._cwGain.gain.cancelScheduledValues(this._ctx.currentTime)
        this._cwGain.gain.value = 0
    }
    // https://github.com/cwilso/metronome/
    // https://www.html5rocks.com/en/tutorials/audio/scheduling/
    _morsePlay() {
        switch (this._state) {
            case 'INITIAL':
                this._startTime = this._ctx.currentTime + 0.01
                break;
            case 'STOPPED':
                this._startTime = this._ctx.currentTime - this._seqence[this._currPos].time;
                break;
            case 'ENDED':
                this._currPos = 0;
                this._startTime = this._ctx.currentTime + 0.01
                break;
        }
        this._state = 'STARTED';
        // start time of the current player sequence
        let ahead = this._ditLen * 10; // number of time we look ahead for new events to play
        this._runId++;
        let currRun = this._runId;
        let scheduled = () => {
            if (currRun !== this._runId) return;
            let current = this._ctx.currentTime;
            let delta = current - this._startTime;
            for (; ;) {
                if (this._currPos >= this._seqence.length) {
                    this._state = 'ENDED';
                    this._currPos = 0;
                    // this._gain.gain.exponentialRampToValueAtTime(0, this._ctx.currentTime + 1.00)
                    break; // exit look if current position reach end
                }
                let ev = this._seqence[this._currPos]; // pick current event
                if (ev.time < delta + ahead) { // check the event is part of current lookahead
                    this._currPos++;
                    switch (ev.action) {
                        case 'PLAY': {
                            switch (ev.tone) {
                                case '.': {
                                    this._cwGain.gain.setValueAtTime(1, this._startTime + ev.time)
                                    this._cwGain.gain.setValueAtTime(0, this._startTime + ev.time + this._ditLen )
                                    break;
                                }
                                case '_': {                                
                                    this._cwGain.gain.setValueAtTime(1, this._startTime + ev.time)
                                    this._cwGain.gain.setValueAtTime(0, this._startTime + ev.time + (this._ditLen * 3))
                                    break;
                                }
                            }
                            break;
                        }
                        case 'DISPLAY': {
                            let milis = (ev.time - (current - this._startTime)) * 1000;
                            setTimeout(() => {
                                if (this._displayCallback) this._displayCallback(ev);
                            }, milis);
                            break;
                        }
                    }
                } else break;
            }
            if (this._state === 'STARTED') setTimeout(scheduled, (ahead * 1000) / 3);
        }
        scheduled();
    }

    _seqenceEvents(conv) {
        let seq = [];
        let current = 0;
        let currDits = 0;
        let currSpaceDits = 0;
        let currText = "";

        conv.forEach(letter => {
            switch (letter.pattern) {
                case ' ':
                    currText += ' ';
                    //                    seq.push({ time: current, dits: currDits, spaces: currSpaceDits, action: 'DISPLAY', value: ' ', text: currText });
                    current += this._spaceDitLen * 7;
                    currSpaceDits += 7;
                    seq.push({
                        time: current,
                        dits: currDits,
                        spaces: currSpaceDits,
                        action: 'DISPLAY',
                        value: ' ',
                        text: currText
                    });
                    break
                case '*':
                    current += this._spaceDitLen * 3
                    currSpaceDits += 3
                    break
                default:
                    let word = letter.pattern.split("").join("*");
                    currText += letter.text;
                    //                    seq.push({ time: current, dits: currDits, spaces: currSpaceDits, action: 'DISPLAY', value: letter.text, text: currText });
                    [...word].forEach(tone => {
                        currDits++;
                        switch (tone) {
                            case '.':
                                seq.push({
                                    time: current,
                                    dits: currDits,
                                    spaces: currSpaceDits,
                                    action: 'PLAY',
                                    tone: '.'
                                });
                                current += this._ditLen;
                                break
                            case '-':
                                seq.push({
                                    time: current,
                                    dits: currDits,
                                    spaces: currSpaceDits,
                                    action: 'PLAY',
                                    tone: '_'
                                });
                                current += this._ditLen * 3
                                currDits += 2
                                break
                            case '*':
                                current += this._ditLen;
                                break
                            default:
                                debugger
                        }
                    });
                    seq.push({
                        time: current,
                        dits: currDits,
                        spaces: currSpaceDits,
                        action: 'DISPLAY',
                        value: letter.text,
                        text: currText
                    });
                    break;
            }
        })
        return seq;
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
                    result.push({
                        pattern: pattern
                    })
                    last_is_char = false;
                } else {
                    if (last_is_char) result.push({
                        pattern: '*'
                    });
                    result.push({
                        pattern: pattern,
                        offset: offset,
                        length: length,
                        text: low_str.substr(offset, length)
                    });
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

let wpm = document.getElementById("wpm").value;
let fw = document.getElementById("fw").value;
let freq = parseInt(document.getElementById("freq").value);

let m = new Morse(audioCtx, wpm, freq, fw);

const out = document.getElementById("out");
//m.text = morseTxt;
m.displayCallback = (ev) => {
    out.textContent = ev.text;
    out.scrollTop = out.scrollHeight;
}
const button = document.getElementById("morse");

button.onclick = function () {
    switch (m.state) {
        case 'STARTED':
            m.stop();
            break;
        default:
            let freq = parseInt(document.getElementById("freq").value);
            let morseTxt = document.getElementById("txt").value;
            let wpm = document.getElementById("wpm").value;
            let fw = document.getElementById("fw").value;
            out.textContent = '';
            out.scrollTop = out.scrollHeight;
            m.text = morseTxt;
            m.frequency = freq;
            m.wpm = wpm;
            m.farnsworth = fw;
            m.start();
            break;
    }
}



const generate = document.getElementById("generate");
generate.onclick = function () {
    let random = document.getElementById("random").value
    random.replace(/\s/g, "")
    if (random.length > 0) {
        let randChar = (s) => {
            return s.charAt(Math.floor(Math.random() * s.length))
        }

        let r = "";
        for (let i = 0; i < 2000;) {
            r += randChar(random)
            i++
            if (i % 5 == 0) r += ' '
            if (i % 50 == 0) r += '\n'

        }
        document.getElementById("txt").value = r.toLowerCase()
    }
}
