let express = require("express");
let mysql = require("mysql");
let bcrypt = require("bcrypt");

let app = express();
app.use(express.json()); // För att kunna läsa JSON-data från klienten

// Starta servern
app.listen(3000, () => {
  console.log("Servern körs på port 3000");
});

// Skapa koppling till databasen
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "webbserverprogrammering",
});

con.connect((err) => {
  if (err) throw err;
  console.log("Ansluten till databasen!");
});

// Dokumentation av API-routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/dokumentation.html");
});

// Hämta alla användare
app.get("/users", (req, res) => {
  con.query(
    "SELECT id, firstname, lastname, userId FROM users",
    (err, result) => {
      if (err) {
        res.status(500).send("Databasfel");
        return;
      }
      res.json(result);
    }
  );
});

// Hämta en specifik användare via id
app.get("/users/:id", (req, res) => {
  let sql = "SELECT id, firstname, lastname, userId FROM users WHERE id = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) {
      res.status(500).send("Databasfel");
      return;
    }
    if (result.length === 0) {
      res.status(404).send("Användare ej hittad");
      return;
    }
    res.json(result[0]);
  });
});

// Skapa en ny användare (POST)
app.post("/users", async (req, res) => {
  if (!req.body.userId || !req.body.passwd) {
    res.status(400).send("userId och lösenord krävs!");
    return;
  }

  let fields = ["firstname", "lastname", "userId", "passwd"];
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Okänt fält: " + key);
      return;
    }
  }

  try {
    let hashedPassword = await bcrypt.hash(req.body.passwd, 10); // Hasha lösenordet

    let sql =
      "INSERT INTO users (firstname, lastname, userId, passwd) VALUES (?, ?, ?, ?)";
    let values = [
      req.body.firstname,
      req.body.lastname,
      req.body.userId,
      hashedPassword,
    ];

    con.query(sql, values, (err, result) => {
      if (err) {
        res.status(500).send("Databasfel");
        return;
      }

      let output = {
        id: result.insertId,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        userId: req.body.userId,
      };
      res.status(201).json(output);
    });
  } catch (error) {
    res.status(500).send("Fel vid hashning av lösenord");
  }
});

// Uppdatera en användare (PUT)
app.put("/users/:id", async (req, res) => {
  let { firstname, lastname, passwd } = req.body;
  let updates = [];
  let values = [];

  if (firstname) {
    updates.push("firstname = ?");
    values.push(firstname);
  }
  if (lastname) {
    updates.push("lastname = ?");
    values.push(lastname);
  }
  if (passwd) {
    let hashedPassword = await bcrypt.hash(passwd, 10);
    updates.push("passwd = ?");
    values.push(hashedPassword);
  }

  if (updates.length === 0) {
    res.status(400).send("Inga giltiga fält att uppdatera");
    return;
  }

  values.push(req.params.id);
  let sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

  con.query(sql, values, (err, result) => {
    if (err) {
      res.status(500).send("Databasfel");
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send("Användare ej hittad");
      return;
    }
    res.json({ message: "Användare uppdaterad" });
  });
});

// Inloggningsroute (POST /login)
const crypto = require("crypto"); //INSTALLERA MED "npm install crypto" I KOMMANDOTOLKEN
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

// importera jsonwebtoken och tilldela hemlig nyckel
const jwt = require("jsonwebtoken"); // installera med "npm install jsonwebtoken"
const secret = "EnHemlighetSomIngenKanGissaXyz123%&/";

app.post("/login", function (req, res) {
  console.log(req.body);
  let sql = `SELECT * FROM users WHERE userId='${req.body.userId}'`;

  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    let passwordHash = hash(req.body.passwd);
    if (result[0].passwd == passwordHash) {
      //Denna kod skapar en token att returnera till anroparen.
      let payload = {
        sub: result[0].userId, //sub är obligatorisk
        name: result[0].firstname, //Valbar information om användaren
        lastname: result[0].lastname,
      };
      let token = jwt.sign(payload, secret);
      res.json(token);
    } else {
      res.sendStatus(401);
    }
  });
});
