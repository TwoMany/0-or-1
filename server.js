const { db, ObjectId } = require("./database_config");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const CronJob = require("cron").CronJob;
const socketIO = require("socket.io");
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV == "production" ? "https://server.illusion-game.com" : "http://localhost:8000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    //allowedHeaders: ["my-custom-header"],
  },
});

const bodyParser = require("body-parser");
const _ = require("lodash");

const users = db.collection("users");
const runningJobs = [];

const defaultHour = 22;
const defaultMinutes = 0;
const roundInterval = 60000;
const phases = [
  'START',
  'IDLE'
]
var gameRunning = false;

async function stopAllJobs() {
  for (const job of runningJobs) {
    job.stop();
  }
  runningJobs.length = 0;
}


async function setup(kicked) {
  const players = await db.collection("players").find({}).toArray();
  const playersToDelete = [];
  const targetLength = Math.pow(2, Math.floor(Math.log2(players.length)));
  const allowedPlayers = players.slice(0, targetLength);

  playersToDelete.push(...players.slice(targetLength, players.length));

  await db.collection("players").deleteMany({ _id: { $in: playersToDelete.map((el) => el._id) } });

  if (kicked && _.get(playersToDelete, 'length') > 0) {
    io.emit("kicked", playersToDelete.map((el) => el.userId));
    io.emit("GAME_SOCKET", { players: allowedPlayers, phase: phases[0] });
  } else {
    // io.emit("losers", playersToDelete.map((el) => el.userId));
  }


  // io.emit("players", allowedPlayers);

  return allowedPlayers;
}

async function game() {
  try {
    const { gameStartHour, gameStartMinutes, roundInterval } = await db.collection("timer_settings").findOne({});

    const job = new CronJob(
      `* ${gameStartMinutes || defaultMinutes} ${gameStartHour || defaultHour} * * *`,
      () => {
        if (!gameRunning) {
          gameRunning = true;
          startGame(roundInterval);
        }
      },
      null,
      true,
      "Etc/GMT"
    );

    job.start();
    runningJobs.push(job);

  } catch (error) {
    console.log(error);
  }
}

game();

async function startGame(roundInterval) {
  const members = await setup(true);
  if (_.get(members, "length") >= 2) {
    const gameInterval = setInterval(async () => {
      const players = await setup(false);


      // io.emit("GAME_SOCKET", { players, phase: phases[1] });
      await db.collection('phases').deleteMany();
      await db.collection('phases').insertOne({phase: phases[0]});

      for (let i = 0; i < players.length - 1; i += 2) {
        players[i].bot = false;
        players[i + 1].bot = false;

        if (!players[i].answer) {
          players[i].answer = String(Math.round(Math.random()));
          players[i].bot = true;
        }

        if (!players[i + 1].answer) {
          players[i + 1].answer = String(Math.round(Math.random()));
          players[i + 1].bot = true;
        }

        if (_.isEqual(players[i].answer, players[i + 1].answer)) {
          // io.emit("losers", [players[i].userId]);
          await db.collection("players").deleteOne({ _id: players[i]._id });
          await db.collection("players").updateOne({ _id: players[i + 1]._id }, { $set: { answer: null, bot: players[i + 1].bot } });
        } else if (!_.isEqual(players[i].answer, players[i + 1].answer)) {
          // io.emit("losers", [players[i + 1].userId]);
          await db.collection("players").deleteOne({ _id: players[i + 1]._id });
          await db.collection("players").updateOne({ _id: players[i]._id }, { $set: { answer: null, bot: players[i].bot } });
        }
      }
      let eventPlayers = await db.collection("players").find({}).toArray();

      // setTimeout(() => io.emit("GAME_SOCKET", { players: eventPlayers, phase: phases[1] }), 10000);
      // await db.collection('phases').deleteMany();
      // await db.collection('phases').insertOne({phase: phases[1]});

      // io.emit("players", eventPlayers);


      io.emit("GAME_SOCKET", { players: eventPlayers, phase: phases[0] });

      if (eventPlayers.length == 1) {
        clearInterval(gameInterval);
        await db.collection("winners").insertOne(_.omit(...eventPlayers, ["_id", "answer"]));
        await db.collection("players").deleteMany({});
        await db.collection('phases').deleteMany();
        io.emit("game_finished", { winner: { ...eventPlayers[0] } });
        gameRunning = false;
        return;
      }
    }, roundInterval);

  } else {
    await db.collection("players").deleteMany({});
    gameRunning = false;
    io.emit("start_game_failed", "Игра не началась, недостаточное колличество игроков!");
  }
}
/// post anwser

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
// app.use((req, res, next) => {
//   if (process.env.NODE_ENV !== "production") {
//     res.header("Access-Control-Allow-Origin", "*"); 
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); 
//     next();
//   }
// });

app.post("/answer", async (req, res) => {
  const { userId, answer } = req.body;

  await db.collection("players").updateOne({ userId: userId }, { $set: { answer: answer } });
  const players = await db.collection("players").find({}).toArray();
  io.emit("players", players);
  res.status(200).send({ response: players });
});

app.get("/players", async (req, res) => {
  const players = await db.collection("players").find({}).toArray();
  const [phases] = await db.collection("phases").find({}).toArray();
  // io.emit("players", players);
  res.status(200).send({ response: { players, phase: _.get(phases, 'phase', null)} });
});

app.get("/users", async (req, res) => {
  var users;

  if (_.get(req, 'query._id')) {
    users = await db.collection("users").findOne({ _id: new ObjectId(req.query._id) });
  } else {
    users = await db.collection("users").find({}).toArray();
  }
  res.status(200).send({ response: users });
});

app.get("/videos", async (req, res) => {

  const vids = await db.collection("videos").find({}).toArray();

  res.status(200).send({ response: vids });
});

app.post("/videos", async (req, res) => {
  const {
    name,
    link
  } = req.body;

  const insertedVid = await db.collection("videos").insertOne({ name: name || '', link: link });

  res.status(200).send({ response: insertedVid });
});

app.delete("/videos", async (req, res) => {
  const {
    _id
  } = req.body;

  const deletedVid = await db.collection("videos").deleteOne({ _id: new ObjectId(_id) });

  res.status(200).send({ response: deletedVid });
});

app.get("/time", async (req, res) => {
  const { gameStartHour, gameStartMinutes, roundInterval } = await db.collection("timer_settings").findOne({});
  res.status(200).send({ gameStartHour, gameStartMinutes, roundInterval });
});

app.post("/time", async (req, res) => {
  const { gameStartHour, gameStartMinutes, roundInterval } = req.body;

  const time = await db.collection("timer_settings").findOne({});

  const updatedTime = await db
    .collection("timer_settings")
    .updateOne(
      { _id: _.get(time, "_id") },
      { $set: { gameStartHour: gameStartHour, gameStartMinutes: gameStartMinutes, roundInterval: roundInterval } }
    );
  io.emit("RESET", []);
  await stopAllJobs();
  await game();

  res.status(200).send({ response: updatedTime || null });
});

app.post("/signup", async (req, res) => {
  const { login, phone, password, credit, crypto } = req.body;

  const existingUser = await users.findOne({
    $or: [
      {
        login: login
      },
      {
        phone: phone
      }
    ]
  });

  if (existingUser) {
    res.status(400).send({ response: `User already exist` });
  } else {
    await users.insertOne({
      login,
      phone,
      password,
      isAdmin: false,
      credit: credit || '',
      crypto: crypto || ''
    });

    const insertedClient = await users.findOne({ login, phone, password });

    if (insertedClient) {
      res.status(200).send({ response: `User ${insertedClient.login} was created` });
    } else {
      res.status(400).send({ response: `User does not created` });
    }
  }

});

app.post("/signin", async (req, res) => {
  const { phone, password } = req.body;
  const userData = await users.findOne({ phone, password });

  if (userData) {
    const response = _.omit(userData, "password");
    res.status(200).send({ response });
  } else {
    res.status(400).send({ error: "Invalid credentials" });
  }
});

app.put("/user", async (req, res) => {
  const { _id, card, password, credit, crypto } = req.body;

  const o_id = new ObjectId(_id);
  const userData = await users.findOne({ _id: o_id });

  let response = undefined;
  if (password && userData && userData.password != password) {
    response = await users.findOneAndUpdate({ _id: o_id }, { $set: { password } }, { returnOriginal: true });
  }

  if (card) {
    response = await users.findOneAndUpdate({ _id: o_id }, { $set: { card } }, { returnOriginal: true });
  }

  if (credit) {
    response = await users.findOneAndUpdate({ _id: o_id }, { $set: { credit } }, { returnOriginal: true });
  }

  if (crypto) {
    response = await users.findOneAndUpdate({ _id: o_id }, { $set: { credit } }, { returnOriginal: true });
  }

  response = _.omit(_.get(response, "value", {}), "password");

  if (response && _.get(response, "_id")) {
    res.status(200).send({ response: response });
  } else {
    res.status(400).send({ response: "Something went wrong" });
  }
});

app.post("/participate", async (req, res) => {
  const { _id, login } = req.body;

  if (_id && login) {
    const existingPlayer = await db.collection("players").findOne({ userId: new ObjectId(_id) });

    if (!existingPlayer) {

      const player = await db.collection("players").insertOne({ userId: _id, name: login, answer: null, bot: null });
      const players = await db.collection("players").find({}).toArray();

      io.emit("players", players);

      res.status(200).send({ response: player });

    } else {
      res.status(200).send({ response: 'Already registered for the game' });
    }

  } else {
    res.status(200).send({ response: 'Go away, null' });
  }

});
server.listen(8000);

io.on("connection", async (socket) => {
  socket.on("disconnect", () => { });
});
