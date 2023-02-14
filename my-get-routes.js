var express = require("express");
const path = require("path");
const fs = require("fs");
var app = express();
const cors = require("cors");

//this is a middleware part(1)
app.use(function (req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
});

// this is middleware part(2)
app.use(function (req, res, next) {
  var imagePath = path.join(__dirname, "static", req.url);
  fs.stat(imagePath, function (err, fileInfo) {
    if (err) {
      next();
      return;
    }
    if (fileInfo.isFile()) {
      res.sendFile(imagePath);
    } else {
      next();
    }
  });
});

// define the directory where the images are stored
const imagesPath = path.join(__dirname, "lessonImages");

//using URL for connecting DB
let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");
//URL-Encoding of User and PWD
//for potential special characters
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd")); //encode speical character
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

// // option1: indicated by mongoDB atlas
// let db;
// const { MongoClient, ServerApiVersion } = require("mongodb");
// // const uri =
// //   "mongodb+srv://WebstoreUser:<password>@webstorecluster.tj3hvrg.mongodb.net/?retryWrites=true&w=majority";
// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverApi: ServerApiVersion.v1,
// });
// client.connect((err) => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

//option 2 (better) can connect mongodb with stable API
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

app.use(cors());
app.set("json spaces", 3);
//if search is empty it still can return
app.get("/favicon.ico", (req, res) => res.status(204));

// same as using morgan
app.use(function (req, res, next) {
  console.log("Url requested: " + req.url);
  //res.end("welcome!");
  next();
});

// parse requests to json
app.use(express.json());

app.param("collectionName", function (req, res, next, collectionName) {
  req.collection = db.collection(collectionName);
  return next();
});

app.get("/", function (req, res, next) {
  res.end("welcome!");
});
// get a collection in webpage
app.get("/collections/:collectionName", function (req, res, next) {
  req.collection.find({}).toArray(function (err, results) {
    if (err) {
      return next(err);
    }
    res.send(results);
  });
});

//get a collection by filtering/ sorting purposes

app.get(
  "/collections/:collectionName/:max/:sortAspect/:sortAscDesc",
  function (req, res, next) {
    // TODO: Validate params
    var max = parseInt(req.params.max, 10); // base 10
    let sortDirection = 1;
    if (req.params.sortAscDesc === "desc") {
      sortDirection = -1;
    }
    req.collection
      .find({}, { limit: max, sort: [[req.params.sortAspect, sortDirection]] })
      .toArray(function (err, results) {
        if (err) {
          return next(err);
        }
        res.send(results);
      });
  }
);

// a get collection by its id
app.get("/collections/:collectionName/:id", function (req, res, next) {
  req.collection.findOne(
    { _id: new ObjectId(req.params.id) },
    function (err, results) {
      if (err) {
        return next(err);
      }
      res.send(results);
    }
  );
});

// a get collection by using search
app.get(
  "/collections/:collectionName/search/:search",
  function (req, res, next) {
    req.collection
      .find({ subject: { $regex: req.params.search, $options: "i" } })
      .toArray(function (err, results) {
        if (err) {
          return next(err);
        }
        res.send(results);
      });
  }
);

// post something to a collection(maybe change collection to order collection)
app.post("/collections/:collectionName", function (req, res, next) {
  // TODO: Validate req.body
  req.collection.insertOne(req.body, function (err, results) {
    if (err) {
      return next(err);
    }
    res.send(results);
  });
});

// delete a products by its id in collection
app.delete("/collections/:collectionName/:id", function (req, res, next) {
  req.collection.deleteOne(
    { _id: new ObjectId(req.params.id) },
    function (err, result) {
      if (err) {
        return next(err);
      } else {
        res.send(
          result.deletedCount === 1 ? { msg: "success" } : { msg: "error" }
        );
      }
    }
  );
});

// a PUT API update an element
app.put("/", function (req, res) {
  res.send("Okay, let's update an element.");
});
// put that can update the space
app.put("/collections/:collectionName/:id", function (req, res, next) {
  // TODO: Validate req.body
  req.collection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { safe: true, multi: false },
    function (err, result) {
      if (err) {
        return next(err);
      } else {
        res.send(
          result.matchedCount === 1 ? { msg: "success" } : { msg: "error" }
        );
      }
    }
  );
});

// const lessons = [
//   { topic: "math", location: "Hendon", price: 100 },
//   { topic: "math", location: "Colindale", price: 80 },
//   { topic: "math", location: "Brent Cross", price: 90 },
//   { topic: "math", location: "Golders Green", price: 120 },
// ];

// const user = [{ email: "user@email.com", password: "mypassword" }];

// app.get("/lessons", function (req, res) {
//   res.json(lessons);
// });

// app.get("/user", function (req, res) {
//   res.end(JSON.stringify(user, null, 2));
// });
// //   var userId = parseInt(req.params.userid, 10);
// //   //res.send("User: " + req.params.userid);

// //   if (isNaN(userId)) {
// //     res.status(404).send("The userid is not valid!");
// //   } else {
// //     res.send("User: " + userId);
// //   }
// // });

// app.get(/^\/users\/(\d+)$/, function (req, res) {
//   // Convert userid into an integer
//   var userId = parseInt(req.params[0], 10); // base 10
//   res.end(JSON.stringify(user, null, 2));
// });

// // localhost:3000/search?q=javascriptthemed%20burrito
// // app.get("/search", function (req, res) {
// //   if (req.query.q === "javascript-themed burrito") {
// //     res.send("Burrito search performed");
// //   } else {
// //     res.send("Another query and/or parameter");
// //   }
// // });

app.use(function (req, res) {
  res.status(404).send("Page not found!");
});

// app.listen(3000, function () {
//   console.log("App started on port 3000");
// });
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("App started on port: " + port);
});
