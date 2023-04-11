const CryptoJS = require('crypto-js');
const XLSX = require('sheetjs-style');
var TYPES = require('./id-text.json');
const {User} = require('./models');

const translateIds = (from, inp) => {
  if (from == 'ID') {
    for (let index = 0; index < TYPES.length; index++) {
      const element = TYPES[index];
      if (element._id == inp){
        return element.text;
      }
    }
  } else {
    for (let index = 0; index < TYPES.length; index++) {
      const element = TYPES[index];
      if (element.text == inp){
        return element._id;
      }
    }
  }
}

function encryptPath (path) {
  var encrypted = CryptoJS.Rabbit.encrypt(path, process.env.PRIVATE_KEY);
  return encrypted.toString().replaceAll('/', '*');
}

const GetMember = async (id) => {
  try {
    var member = await User.findOne({_id: id});
    member.password = "*";
    return member;
  } catch (error) {
    console.log(error);
  }
}

const PrepareForDisp = (survey, questions, responses) => {
  switch (survey.type) {
    case "ONLINE":
      // Clean Questions
      var temp_questions = []
      questions.forEach(question => {
        var temp_choices = []
        question.options.forEach(op => {
          temp_choices.push({
            _id: (op._id+"").substring(12,24),
            choice: op.text
          })
        })
        temp_questions.push({
          _id: (question._id+"").substring(12,24),
          question: question.questionText,
          question_type: translateIds("ID", question.inputType),
          options: temp_choices,
          number: question.number
        })
      });
      // Clean Responses
      var temp_responses = []
      responses.forEach(response => {
        var temp_answers = []
        response.answers.forEach(answer => {
          temp_answers.push({
            _id: (answer._id+"").substring(12,24),
            answer_type: translateIds("ID", answer.inputType),
            question_id: (answer.questionId+"").substring(12,24),
            answer: properDisplay(answer, questions, "ONLINE")
          })
        })
        temp_responses.push({
          _id: (response._id+"").substring(12,24),
          answers: temp_answers,
          sent_date: response.sentDate
        })
      });
      return {
        SURVEYINFO: {
          NAME: survey.name,
          SHORTID: survey.shortSurveyId,
          TYPE: survey.type,
          STATUS: survey.status,
          DESCRIPTION: survey.description,
          CREATEDON: survey.createdOn,
          RESPONSE_COUNT: survey.responses.length
        },
        QUESTIONS: temp_questions,
        RESPONSES: temp_responses
      }
    /*---------------------------------------------------*/
    case "REGULAR":
      // Clean Questions
      var temp_questions = []
      questions.forEach(question => {
        var temp_choices = []
        question.options.forEach(op => {
          temp_choices.push({
            _id: (op._id+"").substring(12,24),
            choice: op.text[0].text
          })
        })
        temp_questions.push({
          _id: (question._id+"").substring(12,24),
          question: question.questionText[0].text,
          question_type: translateIds("ID", question.inputType),
          options: temp_choices,
          number: question.number
        })
      });
      // Clean Responses
      var temp_responses = []
      responses.forEach(response => {
        var temp_answers = []
        response.answers.forEach(answer => {
          temp_answers.push({
            _id: (answer._id+"").substring(12,24),
            answer_type: translateIds("ID", answer.inputType),
            question_id: (answer.questionId+"").substring(12,24),
            answer: properDisplay(answer, questions, "REGULAR")
          })
        })
        temp_responses.push({
          _id: (response._id+"").substring(12,24),
          answers: temp_answers,
          sent_date: response.sentDate
        })
      });
      return {
        SURVEYINFO: {
          NAME: survey.name,
          SHORTID: survey.shortSurveyId,
          TYPE: survey.type,
          STATUS: survey.status,
          DESCRIPTION: survey.description,
          CREATEDON: survey.createdOn,
          RESPONSE_COUNT: survey.responses.length
        },
        QUESTIONS: temp_questions,
        RESPONSES: temp_responses
      }
    default:
      break;
  }
}

const properDisplay = (answer, questions, surveyType) => {
  switch (translateIds("ID", answer.inputType)) {
    case "GEO-POINT":
      
      break;
    case "MULTI-GEO-POINT":
      
      break;
    case "CHOICE":
      if (surveyType == "ONLINE"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        return theQuestion.options.filter(o => o._id == answer.answer)[0].text;
      }
      else if (surveyType == "REGULAR"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        return theQuestion.options.filter(o => o._id == answer.answer)[0].text[0].text;
      }
    case "MULTI-SELECT":
      if (surveyType == "ONLINE"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        var theOptions = theQuestion.options.filter(o => answer.answer.includes(o._id));
        var DisplayFinalAns = ""
        theOptions.forEach(theO => DisplayFinalAns+theO.text+", ")
        return DisplayFinalAns
      }
      else if (surveyType == "REGULAR"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        var theOptions = theQuestion.options.filter(o => answer.answer.includes(o._id));
        var DisplayFinalAns = ""
        theOptions.forEach(theO => DisplayFinalAns+theO.text[0].text+", ")
        return DisplayFinalAns
      }
    default:
      if (["FILE", "PHOTO"].includes(translateIds("ID", answer.inputType))) {

      }
      else if (["MULTI-FILE", "MULTI-PHOTO"].includes(translateIds("ID", answer.inputType))) {

      }
      else if (["TEXT", "NUMBER", "TIME", "DATE"].includes(translateIds("ID", answer.inputType))) {
        return answer.answer
      }
      else if (["MULTI-TEXT", "MULTI-NUMBER", "MULTI-TIME", "MULTI-DATE"].includes(translateIds("ID", answer.inputType))) {

      }
      break;
  }
}

module.exports = {
  translateIds,
  PrepareForDisp
}