const localtunnel = require('localtunnel');

(async () => {
    const tunnel = await localtunnel({ port: 3000, subdomain: "kett" });
    // tunnel.url;
    log(tunnel.url);

    tunnel.on('close', () => {
        log("tunnel has closed :(");
    });
})();

const express = require('express');
const bodyParser = require('body-parser');

let app = express();

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let server = app.listen(3000, 'localhost');

log("sLeaderboard Started");

app.get("/test", (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.send("Hello World!");
});

app.post("/leaderboard", (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    data = request.body;
    console.log(data);

    let s = leaderboardData.addScore(
        data.id,
        data.username,
        parseInt(data.score),
        parseInt(data.validation));
    log(s);
    response.json({ message: s });
});

app.get("/leaderboard", (request, response) => {
    // console.log(request.body);
    // response.json({ message: "ok" });
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.json(leaderboardData.topScores(15));
});

const fs = require('fs');
let leaderboardData = { "empty": true };
SetupLeaderboardFile();
leaderboardData.write();

function SetupLeaderboardFile() {
    let rawdata = fs.readFileSync('LeaderboardData/leaderboardData.json');
    leaderboardData = JSON.parse(rawdata);

    if (leaderboardData.empty) {
        leaderboardData = new Leaderboard();
    } else leaderboardData = new Leaderboard(leaderboardData);

    return leaderboardData;
}

function Leaderboard(data) {
    this.lastUpdated = data ? data.lastUpdated : new Date().toLocaleTimeString();
    this.scores = data ? data.scores : [];

    this.addScore = (id, username, score, validation) => {
        if (!id || !username || !score || !validation) return "Invalid Data";
        //if (validation != (((score % 1187) * 19) + 1619) % 512 * 61) return "Invalid Score";

        let index = this.indexById(id);

        let data = {
            "id": id,
            "username": username,
            "score": score,
            "timeStamp": new Date().toLocaleTimeString()
        };

        if (index < 0) {
            this.insertScoreData(data);
        } else if (this.scores[index].score < data.score) {
            this.scores.splice(index, 1);
            this.insertScoreData(data);
            //this.scores[index] = data;
        } else return "Score Submitted"

        this.write();
        return "Score Submitted";
    }

    this.insertScoreData = (data) => {
        for (let i = 0; i < this.scores.length; i++) {
            if (data.score > this.scores[i].score) {
                return this.scores.splice(i, 0, data);
            }
        }
        this.scores.push(data);
    }

    this.indexById = (id) => {
        for (let i = 0; i < this.scores.length; i++) {
            if (id == this.scores[i].id) return i;
        }
        return -1;
    }

    this.getScoreById = (id) => {
        let index = this.indexById(id);
        let data = this.scores[index];

        return { name: data.username, score: data.score, rank: index }
    }

    this.topScores = (count) => {
        let top = [];
        for (let i = 0; i < Math.min(count, this.scores.length); i++) {
            top.push({ name: this.scores[i].username, score: this.scores[i].score, rank: i });
        }
        return top;
    };

    this.write = () => {
        leaderboardData.lastUpdated = new Date().toLocaleTimeString();

        let data = JSON.stringify(leaderboardData, null, 4);
        fs.writeFileSync('LeaderboardData/leaderboardData.json', data);
    }
}

function log(message) {
    console.log("[" + (new Date().toLocaleTimeString()) + "] " + message);
}