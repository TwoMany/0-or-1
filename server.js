const { db } = require('./database_config');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const CronJob = require('cron').CronJob;
const bodyParser = require('body-parser');
const _ = require('lodash');

const READLER = 'READLER';
const GUESSER = 'GUESSER';
const users = db.collection('users');

async function startGame(data) {
  const players = data ? data : await db.collection('players').find({}).toArray();

  if(_.get(players, 'length') >= 2) {
    const gameArray = [];
    const targetLength = Math.pow(2, Math.floor(Math.log2(players.length)));
    const arr = players.slice(0, targetLength).sort(() => 0.5 - Math.random());
    const readlers = arr.slice(0, arr.length / 2);
    const guessers = arr.slice(arr.length / 2, arr.length);

    for(let i = 0; i < arr.length / 2; i++) {
      Object.assign(readlers[i], { type: READLER, answer: null });
      Object.assign(guessers[i], { type: GUESSER, answer: null });
      gameArray.push({readler: readlers[i], guesser: guessers[i], roomId: i + 1});
      
      io.emit('new-user', readlers[i]);
      io.emit('new-user', guessers[i]);
    }

    io.emit('gameArray', gameArray);

  } else {
    io.emit('Start game failed', 'Игра не началась, недостаточное колличество игроков!')
  }
}
/// post anwser

app.post('/answer', async (req, res) => {
  const {
    data
  } = req.body;
  const roundComplete = data.every(({readler, guesser}) => (readler.answer && guesser.answer));
  if(roundComplete) {
    const filteredData = [];

    data.forEach(({readler, guesser}) => {
      if(readler.answer == guesser.answer) {
        filteredData.push({...guesser});
      } else {
        filteredData.push({...readler});
      }
      io.sockets.sockets[readler.socketId].leave(readler.roomId);
      io.sockets.sockets[guesser.socketId].leave(guesser.roomId);
    });

    if(_.get(filteredData, 'length') > 1) {
        await startGame(filteredData);
    } else {
      await db.collection('players').deleteMany({});
      
      await db.collection('winners').insertOne({...filteredData.slice(0, 1)});

      io.emit('Game finished', { winner: {...filteredData.slice(0, 1)} });
    }
  }
})

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

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
 const player = await db.collection('players').insertOne({userId: _id, name: login});
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