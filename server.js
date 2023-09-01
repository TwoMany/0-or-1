const { db, ObjectId } = require("./database_config");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const CronJob = require("cron").CronJob;
const socketIO = require("socket.io");
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV == "production" ? "https://server.illusiumgame.com" : "http://localhost:9000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    //allowedHeaders: ["my-custom-header"],
  },
});

const bodyParser = require("body-parser");
const _ = require("lodash");

const users = db.collection("users");
const runningJobs = [];
var timeout;

const defaultHour = 22;
const defaultMinutes = 0;

async function stopAllJobs() {
  for (const job of runningJobs) {
    job.stop();
  }
  runningJobs.length = 0;
}

async function game() {
  try {
    const { gameStartHour, gameStartMinutes } = await db.collection("timer_settings").findOne({});

    const job = new CronJob(
      `* ${gameStartMinutes || defaultMinutes} ${gameStartHour || defaultHour} * * *`,
      async () => {
        await startGame();
      },
      undefined,
      true,
      "Europe/Riga"
    );

    job.start();
    runningJobs.push(job);
    
  } catch (error) {
    console.log(error);
  }
}
game();

async function startGame() {
  const players = await db.collection("players").find({}).toArray();
  const playersToDelete = [];

  if (_.get(players, "length") >= 2) {
    const targetLength = Math.pow(2, Math.floor(Math.log2(players.length)));
    const arr = players.slice(0, targetLength);

    playersToDelete.push(...players.slice(targetLength, players.length));

    await db.collection("players").deleteMany({ _id: { $in: playersToDelete.map((el) => el._id) } });
    io.emit(
      "losers",
      playersToDelete.map((el) => el._id)
    );
    io.emit("players", arr);

    const startRound = async () => {
      let players = await db.collection("players").find({}).toArray();
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
          await db.collection("players").deleteOne({ _id: players[i]._id });
          await db.collection("players").updateOne({ _id: players[i + 1]._id }, { $set: { answer: null } });
        } else if (!_.isEqual(players[i].answer, players[i + 1].answer)) {
          await db.collection("players").deleteOne({ _id: players[i + 1]._id });
          await db.collection("players").updateOne({ _id: players[i]._id }, { $set: { answer: null } });
        }
      }
      players = await db.collection("players").find({}).toArray();
      io.emit("players", players);

      if (players.length > 1) {

        if(timeout){
          clearTimeout(timeout);
        }
        
        timeout = setTimeout(async () => {
          startRound();
        }, 60000);
      } else if (players.length == 1) {
        await db.collection("winners").insertOne(_.omit(...players, ["_id", "answer", "bot"]));
        await db.collection("players").deleteMany({});
        io.emit("players", []);
        io.emit("game_finished", { winner: { ...players[0] } });
      }
    };

    setTimeout(async () => {
      if(timeout){
        clearTimeout(timeout);
      }
      startRound();
    }, 60000);
  } else {
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
  io.emit("players", players);
  res.status(200).send({ response: players });
});

app.get("/users", async (req, res) => {
  var users;

  if(_.get(req, 'query._id')) {
    users = await db.collection("users").findOne({_id: new ObjectId(req.query._id)});
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

  const insertedVid = await db.collection("videos").insertOne({name: name || '', link: link});
  
  res.status(200).send({ response: insertedVid });
});

app.delete("/videos", async (req, res) => {
  const {
    _id
  } = req.body;

  const deletedVid = await db.collection("videos").deleteOne({_id: new ObjectId(_id)});
  
  res.status(200).send({ response: deletedVid });
});

app.get("/time", async (req, res) => {
  const { gameStartHour, gameStartMinutes } = await db.collection("timer_settings").findOne({});
  res.status(200).send({ gameStartHour, gameStartMinutes });
});

app.post("/time", async (req, res) => {
  const { gameStartHour, gameStartMinutes } = req.body;

  const time = await db.collection("timer_settings").findOne({});

  const updatedTime = await db
    .collection("timer_settings")
    .updateOne(
      { _id: _.get(time, "_id") },
      { $set: { gameStartHour: gameStartHour, gameStartMinutes: gameStartMinutes } }
    );

  await stopAllJobs();
  await game();

  res.status(200).send({ response: updatedTime || null });
});

app.post("/signup", async (req, res) => {
  const { login, phone, password, credit, crypto } = req.body;

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

  const player = await db.collection("players").insertOne({ userId: _id, name: login, answer: null, bot: null });
  const players = await db.collection("players").find({}).toArray();

  io.emit("players", players);

  res.status(200).send({ response: player });
});
server.listen(9000);

io.on("connection", async (socket) => {
  socket.on("disconnect", () => {});
});
