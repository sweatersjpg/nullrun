//let pico8_gpio = new Array(128);

const _idle = 0
const _post = 20
const _get = 10
const _ok = 69
const _error = 4

let leaderboard = [];

let apiStatus = "idle";
let attempts = 10;
const maxAttempts = 10;

function checkForStatus() {
    if (attempts < 0) {
        setStatus(_error);
        console.log("communication error");
        clearInterval(checkForStatus);
    }

    if (gotStatus(_idle)) {
        if (apiStatus == "idle") {
            console.log("checking server pulse");
            CheckPulse();
            attempts -= 1;
        }

        if (apiStatus == "complete") {
            apiStatus = "idle";
            console.log("server alive (thank god)");
            attempts = maxAttempts;
            setStatus(_ok);
        }
    }

    if (gotStatus(_post)) {
        if (apiStatus == "idle") {
            let data = getScore();
            console.log(data);
            PostScore(data);
            console.log("posting score");
            attempts -= 1;
        }

        if (apiStatus == "complete") {
            apiStatus = "idle";
            attempts = maxAttempts;
            console.log("sent score!");
            setStatus(_get);
        }

        return;
    }

    if (gotStatus(_get)) {
        if (apiStatus == "idle") {
            console.log("requesting leaderboard");
            GetLeaderboard();
            attempts -= 1;
        }

        if (apiStatus == "complete") {
            apiStatus = "idle";
            attempts = maxAttempts;
            console.log("got leaderboard!");
            writeLeaderboard();
            setStatus(_ok);
        }

        return;
    }
}
setInterval(checkForStatus, 1000);

// ---- api interface ----

function PostScore(data) {
    apiStatus = "waiting";

    fetch("https://kett.loca.lt/leaderboard/", {
        body: JSON.stringify(data),
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (response.ok) {
            apiStatus = "complete";
            //console.log(response);
        }
        else {
            console.log("retrying");
            //PostScore(data);
            apiStatus = "idle";
        }
    });
}

function GetLeaderboard() {
    apiStatus = "waiting";

    fetch("https://kett.loca.lt/leaderboard/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (response.ok) return response.json();
        else {
            //GetLeaderboard(data);
            apiStatus = "idle";
            console.log("retrying");
        }
    }).then(json => {
        //console.log(json);
        leaderboard = json;
        apiStatus = "complete"
    });
}

function CheckPulse() {
    apiStatus = "waiting";
    fetch("https://kett.loca.lt/test/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (response.ok) {
            apiStatus = "complete";
        }
        else {
            //GetLeaderboard(data);
            apiStatus = "idle";
            console.log("retrying");
        }
    });
}

// ---- pico8 interface ----

function setStatus(status) { pico8_gpio[0] = status }
function getStatus() { return pico8_gpio[0] }
function gotStatus(status) { return getStatus() == status }

function writeLeaderboard() {
    for (let i = 0; i < leaderboard.length; i++) {
        let d = 16 + i * 8;
        writeLeaderboardScore(d, leaderboard[i].score, leaderboard[i].name);
    }
}

const ab = "_abcdefghijklmnopqrstuvwxyz".split("");

function writeLeaderboardScore(index, score, name) {
    poke2(index, score);

    for (let i = 0; i < 6; i++) {
        let value = 1;
        if (i < name.length) value = ab.indexOf(name.charAt(i)) + 1;
        poke(index + 2 + i, value);
    }
}

function getScore() {
    let score = {
        score: peek2(8),
        username: getName(10, 6),
        id: getName(2, 6) + "_" + peek(1),
        validation: peek2(16)
    }
    return score;
}

function getName(start, length) {
    let s = "";

    for (let i = 0; i < length; i++) {
        s += ab[peek(start + i) - 1];
    }

    return s;
}

function peek(addr) { return pico8_gpio[addr] }
function poke(addr, n) { pico8_gpio[addr] = n }

function peek2(addr) {
    let a = peek(addr);
    let b = peek(addr + 1);

    return parseInt(toBin(b, 8) + toBin(a, 8), 2);
}

function poke2(addr, n) {
    let byte = toBin(n, 16);
    let a = byte.slice(0, 8);
    let b = byte.slice(8, 16);

    poke(addr, parseInt(b, 2));
    poke(addr + 1, parseInt(a, 2));
}

function toBin(n, l) {
    let b = n.toString(2);
    while (b.length < l) b = "0" + b;
    return b;
}
