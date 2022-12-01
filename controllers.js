const bcrypt = require('bcrypt');
const sanitize = require('./genSantizer');
const {User, Organization, Survey} = require('./models');
const {formatData, filterResponses, exportToXLSX} = require('./helpers');

const auth = async (req, res, next) => {
  var authheader = req.headers.authorization;
  if (!authheader) return res.status(401).json({message:"Authentication Needed"})
  
  var auth = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
  var username = sanitize(auth[0]); var pass = auth[1];
  
  try {
    const user = await User.findOne({ email: username });
    if (user != null) {
      bcrypt.compare(pass, user.password, async function (err, result) {
        if (result) {
          // Admin Pass
          if (user.roleId == '623cc24a8b7ab06011bd1e62' || user.roleId == '623cc24a8b7ab06011bd1e61') {
            return next();
          }
          var org = await Organization.findOne({ _id: user.organizationId });
          // Check if the roles are correct
          if (org != null && (user.roleId == '623cc24a8b7ab06011bd1e60' || user.roleId == '6362ad70297414bfb79bdf01')) {
            // Check if package is eligable
            if (org.packageId != '623d73a051e8bcb894b3f7df'){
              // Check if package has expired
              var expiresAt = new Date(org.expires);
              if (expiresAt.getTime() > new Date().getTime())
                next();
              else return res.status(401).json({message: "Package Expired"})
            } else return res.status(401).json({message: "Package not Allowed"})
          } else return res.status(401).json({message: "Wrong credentials"})
        } else return res.status(401).json({message: "Wrong credentials"})
      });
    } else return res.status(401).json({message: "Wrong credentials"})
  } catch (error) { console.log(error); return res.status(500).send("Bad Input") }
}

const getResponseXL = async (req, res, next) => {
  const surveyId = sanitize(req.params.survey);
  const shortOrgId = sanitize(req.params.shortOrg);
  var surveyFound = false;

  try {
    const accounts = await Organization.aggregate([
      {
        "$match": {
          "orgId": shortOrgId
        },
      },
      {
        "$lookup": {
          "from": "projects",
          "localField": "projectsId",
          "foreignField": "_id",
          "as": "projects",
          "pipeline": [
            {
              "$lookup": {
                "from": "surveys",
                "localField": "surveysId",
                "foreignField": "_id",
                "as": "surveys",
              },
            }
          ],
        }
      }
    ]);
    var account = accounts[0];
    for (let index = 0; index < account.projects.length; index++) {
      const project = account.projects[index];
      if (project.surveys.some(survey => survey.shortSurveyId == surveyId)) // The survey belongs to the org
        surveyFound = true;
    }
  }
  catch (err) {
    console.log(err);
  }

  // If survey is found 
  if (surveyFound) {
    const survey = await Survey.aggregate([
      {
        "$match": {
          "shortSurveyId": surveyId
        }
      },
      {
        "$lookup": {
          "from": "questions",
          "localField": "questions",
          "foreignField": "_id",
          "as": "joined_questions"
        }
      },
      {
        "$lookup": {
          "from": "responses",
          "localField": "responses",
          "foreignField": "_id",
          "as": "joined_responses"
        }
      }
    ]);
    var questions = survey[0].joined_questions.sort(function(x, y){return x.createdOn - y.createdOn;});
    var responses = survey[0].joined_responses;
    var filtered = await filterResponses(responses)

    exportToXLSX(formatData(questions, filtered), surveyId)
    return res.status(200).sendFile('./temp/'+surveyId+'.xlsx', { root: __dirname });
  }

  return res.status(403).json({message: "Bad Input"})

}

const getResponse = async (req, res, next) => {
  var at = req.query.at;
  var from = req.query.from;
  var to = req.query.to;
  const surveyId = sanitize(req.params.survey);
  const shortOrgId = sanitize(req.params.shortOrg);
  var surveyFound = false;

  try {
    const accounts = await Organization.aggregate([
      {
        "$match": {
          "orgId": shortOrgId
        },
      },
      {
        "$lookup": {
          "from": "projects",
          "localField": "projectsId",
          "foreignField": "_id",
          "as": "projects",
          "pipeline": [
            {
              "$lookup": {
                "from": "surveys",
                "localField": "surveysId",
                "foreignField": "_id",
                "as": "surveys",
              },
            }
          ],
        }
      }
    ]);
    var account = accounts[0];
    for (let index = 0; index < account.projects.length; index++) {
      const project = account.projects[index];
      if (project.surveys.some(survey => survey.shortSurveyId == surveyId)) // The survey belongs to the org
        surveyFound = true;
    }
  }
  catch (err) {
    console.log(err);
  }

  // If survey is found 
  if (surveyFound) {
    const survey = await Survey.aggregate([
      {
        "$match": {
          "shortSurveyId": surveyId
        }
      },
      {
        "$lookup": {
          "from": "questions",
          "localField": "questions",
          "foreignField": "_id",
          "as": "joined_questions"
        }
      },
      {
        "$lookup": {
          "from": "responses",
          "localField": "responses",
          "foreignField": "_id",
          "as": "joined_responses"
        }
      }
    ]);
    var questions = survey[0].joined_questions.sort(function(x, y){return x.createdOn - y.createdOn;});
    var responses = survey[0].joined_responses;
  }

  // /shelf/:shortOrg/:survey
  if (at == undefined && from == undefined && to == undefined && surveyFound) {
    try {
      var filtered = await filterResponses(responses)
      return res.status(200).json(formatData(questions, filtered));
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Bad Input" });
    }
  }
  // /shelf/:shortOrg/:survey?at=MM-DD-YYYY
  else if (at != undefined && from == undefined && to == undefined && surveyFound) {
    try {
      var filtered = await filterResponses(responses, from, to, at)
      return res.status(200).json(formatData(questions, filtered));
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Bad Input" });
    }
  }
  // /shelf/:shortOrg/:survey?from=MM-DD-YYYY
  else if (at == undefined && from != undefined && to == undefined && surveyFound) {
    try {
      var filtered = await filterResponses(responses, from)
      return res.status(200).json(formatData(questions, filtered));
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Bad Input" });
    }
  }
  // /shelf/:shortOrg/:survey?from=MM-DD-YYYY&to=MM-DD-YYYY
  else if (from != undefined && to != undefined && at == undefined && surveyFound) {
    try {
      var filtered = await filterResponses(responses, from, to)
      return res.status(200).json(formatData(questions, filtered));
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Bad Input" });
    }
  }
  else {
    return res.status(403).json({ message: "Bad Input" });
  }
}

module.exports = {
  auth,
  getResponse,
  getResponseXL
}