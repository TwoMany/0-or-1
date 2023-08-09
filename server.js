if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const CronJob = require('cron').CronJob;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://hekot77493:nKccvpfYQ5Al2812@cluster1.ippbhts.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    // await client.db('47Database').createCollection('users');
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // console.log(await client.db('47Database').collection("players").findOne({}))
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

const rooms = { }


app.post('/signup', async (req, res) => {
  const { login, phone, password } = req.params;
  console.log('REQ', req);
  const insert = await client.db('47Database').collection("users").insertOne({
    login, phone, password
  });
  return insert;
});

app.post('/signin', async (req, res) => {
  const { phone, password } = req.params;
  const userData = await client.db('47Database').collection("users").findOne({phone, password})

  if(userData) {
    return userData;
  } else {
    throw new Error('Invalid credentials');
  }
});

app.get('/', (req, res) => {
  console.log('--------------------------', rooms)
  res.render('index', { rooms: rooms })
})

app.post('/room', (req, res) => {
  const targetLength = Math.pow(2, Math.floor(Math.log2(users.length)));
  let arr = users.slice(0, targetLength);
  arr = arr.sort(() => 0.5 - Math.random());
  const roomPairs = [];
  const readlers = arr.slice(0, arr.length / 2)
  const answermans = arr.slice(arr.length / 2, arr.length)

  for(let i = 0; i < arr.length / 2; i++) {
    readlers[i].type = 'Readler';
    answermans[i].type = 'AnswerMan';
    roomPairs.push({readler: readlers[i], answerman: answermans[i], roomId: i + 1})
  }


  roomPairs.forEach(({readler, answerman, roomId}) => {
    rooms[roomId] = { users: {} }
    console.log('111111111111111111111111', roomId)
    io.emit('room-created', roomId)
    io.emit('new-user', roomId, readler)
    io.emit('new-user', roomId, answerman)
  })
  console.log('22222222222222222222222222', rooms)
  // if (rooms[req.body.room] != null) {
  //   return res.redirect('/')
  // }
  // rooms[req.body.room] = { users: {} }
  // res.redirect(req.body.room)
  // // Send message that new room was created
  // io.emit('room-created', req.body.room)
})

app.post('/create_user', (req, res) => {
  users.push({
    name: "ALEX",
    id: 3,
    type: 'Readler'
  })
  console.log('users', users)
  io.emit('user-created')
})

app.get('/get_user', (req, res) => {
  console.log('/////////////////', users.find(el=> el.id = 2))
  return users.find(el=> el.id = 2);
})

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/')
  }
  res.render('room', { roomName: req.params.room })
})

server.listen(10000)

io.on('connection', socket => {
  const job = new CronJob('0 * * * * *',
  function() {
      console.log('You will see this message every second');
  },
  null,
  true,
  'Europe/Riga'
)
job.start()
  socket.on('new-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    console.log('11111111111111111111111111111111111', socket.id, name, rooms)
    socket.to(room).broadcast.emit('user-connected', name)
  })
  socket.on('send-chat-message', (room, message) => {
    socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
  })
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