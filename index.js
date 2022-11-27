const express = require('express');
const app = express();
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { auth, getResponse, getResponseXL, getResponseXLs} = require('./controllers');

// Request Rate Limiting
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.set('trust proxy', 1)

dotenv.config(); // Configure to access .env files

// Serve the /temp folder
app.use(express.static('temp'));

// Database Connection
if (process.env.NODE_ENV == 'dev') {
	mongoose.connect(process.env.TEST_DB_URL)
	.catch(error => console.error(error))
	.then(() => app.listen(process.env.PORT, () => console.log("API @ "+process.env.PORT+" & DB @ "+process.env.TEST_DB_URL))) // Connect to the Database
} 
else {
	mongoose.connect(process.env.PROD_DB_URL, {
		authSource: "admin",
		user: process.env.DB_USER,
		pass: process.env.DB_PASS,
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
	.catch(error => console.error(error))
	.then(() => app.listen(process.env.PORT, () => console.log("API @ "+process.env.PORT+" & DB @ "+process.env.PROD_DB_URL))) // Connect to the Database
}

// Clear the /temp folder
setInterval(() => {
  fs.readdirSync(__dirname+'/temp').forEach(f => fs.rmSync(`${__dirname+'/temp'}/${f}`));
}, 600000*12)

app.use(bodyParser.json()); // Parsing JSON body

app.use(auth);

app.get("/shelf/:shortOrg/:survey", auth, getResponse)

app.get("/shelf/xl/:shortOrg/:survey", auth, getResponseXL)

app.get("/shelf/xl/:shortOrg", auth, getResponseXLs)