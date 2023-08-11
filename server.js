const { db } = require('./database_config');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const CronJob = require('cron').CronJob;
const bodyParser = require('body-parser');
const _ = require('lodash');

const users = db.collection('users');

async function startGame() {
  const players = await db.collection('players').find({}).toArray();
  const playersToDelete = [];

  if(_.get(players, 'length') >= 2) {
    const targetLength = Math.pow(2, Math.floor(Math.log2(players.length)));
    const arr = players.slice(0, targetLength);

    playersToDelete.push(...players.slice(targetLength, players.length));

    await db.collection('players').deleteMany({_id: {$in: playersToDelete.map(el=> el._id)}});
    io.emit('players', arr);

    const startRound = async() => {
      let players = await db.collection('players').find({}).toArray();

      for(let i = 0; i < players.length - 1; i+=2) {
        if(players[i].answer == players[i + 1].answer) {
          await db.collection('players').deleteOne({_id: players[i]._id})
          await db.collection('players').updateOne({_id: players[i + 1]._id}, {$set: {answer: null}})

        } else {
          await db.collection('players').deleteOne({_id: players[i + 1]._id})
          await db.collection('players').updateOne({_id: players[i]._id}, {$set: {answer: null}})
        }
      }
      players = await db.collection('players').find({}).toArray();
      io.emit('players', players);

      if(players.length > 1) {
        setTimeout(async()=>{
          startRound()
        }, 60000)
      } else {
        await db.collection('winners').insertOne({...players});
        await db.collection('players').deleteMany({});
        io.emit('players', []);
        io.emit('Game finished', { winner: {...players[0]} });
      }
    }

    setTimeout(async()=>{
      startRound()
    }, 60000)

  } else {
    io.emit('Start game failed', 'Игра не началась, недостаточное колличество игроков!')
  }
}
/// post anwser


app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.post('/answer', async (req, res) => {
  const {
    userId,
    answer,
  } = req.body;

  await db.collection('players').updateOne({userId: userId}, {$set: {answer: answer}});
  const players = await db.collection('players').find({}).toArray();
  io.emit('players', players);
  res.status(200).send({response: players});
})

app.get('/players', async (req, res) => {
  const players = await db.collection('players').find({}).toArray();
  io.emit('players', players);
  res.status(200).send({response: players});
})

const rooms = { }


app.post('/signup', async (req, res) => {
  const { login, phone, password } = req.body;

  await users.insertOne({
    login, phone, password
  });

  const insertedClient = await users.findOne({login, phone, password});

  if(insertedClient) {
    res.status(200).send({ response: `User ${insertedClient.login} was created`});
  } else {
    res.status(400).send({ response: `User does not created` });
  }
});

app.post('/signin', async (req, res) => {
  const { phone, password } = req.body;
  const userData = await users.findOne({phone, password})
  
  if(userData) {
    const response = _.omit(userData, 'password');
    res.status(200).send({ response });
  } else {
    res.status(400).send({error: 'Invalid credentials'});
  }
});

app.put('/user', async (req, res) => {
  const { _id, card, password } = req.body;

  const o_id = new ObjectId(_id);
  const userData = await users.findOne({_id: o_id});

  let response = undefined;
  if(password && userData && userData.password != password) {
    response = await users.findOneAndUpdate({_id: o_id},{ $set: { password } }, { returnOriginal: true });
  }

  if(card) {
    response = await users.findOneAndUpdate({_id: o_id}, { $set: { card }}, { returnOriginal: true });
  }

  response = _.omit(_.get(response, 'value', {}), 'password');

  if(response && _.get(response, '_id')) {
    res.status(200).send({ response: response });
  } else {
    res.status(400).send({ response: 'Something went wrong' });
  }
});


app.get('/', (req, res) => {
  res.render('index', { rooms: rooms })
})

app.post('/participate', async (req, res) => {
  const {
    _id,
    login,
  } = req.body

 const player = await db.collection('players').insertOne({userId: _id, name: login, answer: null});
 const players = await db.collection('players').find({}).toArray();

 io.emit('players', players);

 res.status(200).send({response: player});
})

server.listen(10000)

io.on('connection', async socket => {
    const {
        gameStartHour
    } = await db.collection('timer_settings').findOne({});

    const job = new CronJob(`0 * * * * *`,
        async () => {
                await startGame();
            },
            null,
            true,
            'Europe/Riga'
    )
    
    job.start();

    socket.on('new-user', (player) => {
        const {
            name,
            type,
            roomId
        } = player;

        socket.join(roomId);
        player.socketId = socket.id;

        socket.to(roomId).broadcast.emit('user-connected', name);
    })

    // socket.on('send-chat-message', (room, message) => {
    //   socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    // })
    socket.on('disconnect', () => {
        getUserRooms(socket).forEach(room => {
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        })
    })
})

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if (room.users[socket.id] != null) names.push(name)
        return names
    }, [])
}