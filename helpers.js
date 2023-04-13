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
      return `https://maps.google.com/?q=${(answer.answer+"").split(',')[0]},${(answer.answer+"").split(',')[1]}`
    case "MULTI-GEO-POINT":
      let geoDisp = ""
      answer.answer.forEach(ans => geoDisp = geoDisp.concat(`https://maps.google.com/?q=${(ans+"").split(',')[0]},${(ans+"").split(',')[1]}, \n`))
      return geoDisp
    case "CHOICE":
      if (surveyType == "ONLINE"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        return theQuestion.options.filter(o => o._id == answer.answer)[0].text;
      }
      else if (surveyType == "REGULAR"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        return theQuestion.options.filter(o => String(o._id) == String(answer.answer))[0].text[0].text;
      }
    case "MULTI-SELECT":
      if (surveyType == "ONLINE"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        var theOptions = theQuestion.options.filter(o => answer.answer.includes(String(o._id)));
        var DisplayFinalAns = ""
        theOptions.forEach(theO => DisplayFinalAns = DisplayFinalAns+theO.text+", \n")
        return DisplayFinalAns
      }
      else if (surveyType == "REGULAR"){
        var theQuestion = questions.filter((q) => String(q._id) == String(answer.questionId))[0];
        var theOptions = theQuestion.options.filter(o => answer.answer.includes(o._id));
        var DisplayFinalAns = ""
        theOptions.forEach(theO => DisplayFinalAns+theO.text[0].text+", \n")
        return DisplayFinalAns
      }
    default:
      if (["FILE", "PHOTO"].includes(translateIds("ID", answer.inputType))) {
        return `${process.env.FILE_SERVER_URL}${encryptPath(answer.answer)}`
      }
      else if (["MULTI-FILE", "MULTI-PHOTO"].includes(translateIds("ID", answer.inputType))) {
        let fileDisp = ""
        answer.answer.forEach(ans => fileDisp = fileDisp.concat(`${process.env.FILE_SERVER_URL}${encryptPath(ans)}, \n`))
        return fileDisp
      }
      else if (["DATE"].includes(translateIds("ID", answer.inputType))) {
        return answer.answer.toISOString().split('T')[0]
      }
      else if (["TEXT", "NUMBER", "TIME", "DATE"].includes(translateIds("ID", answer.inputType))) {
        return answer.answer
      }
      else if (["MULTI-TEXT", "MULTI-NUMBER", "MULTI-TIME", "MULTI-DATE"].includes(translateIds("ID", answer.inputType))) {
        let textDisp = ""
        answer.answer.forEach(ans => textDisp = textDisp.concat(`${ans}, \n`))
        return textDisp
      }
      break;
  }
}

const filterResponsesByTime = (responses, restr, time_1, time_2) => {
  switch (restr) {
    case "FROM":
      return responses.filter((resp) => (new Date(resp.sentDate).getTime() >= new Date(time_1).getTime()));
    case "TO":
      return responses.filter((resp) => (new Date(resp.sentDate).getTime() <= new Date(time_1).getTime()));
    case "AT":
      return responses.filter((resp) => (new Date(resp.sentDate).setHours(0,0,0,0).valueOf() === new Date(time_1).setHours(0,0,0,0)).valueOf());
    case "FROM_TO":
      return responses.filter((resp) => (new Date(resp.sentDate).getTime() >= new Date(time_1).getTime()) &&  (new Date(resp.sentDate).getTime() <= new Date(time_2).getTime()));
    default:
      break;
  }
}

const formatDataForExcel = (questions, responses, surveyType, surveyName) => {
  var rows = [];
  var queses = [];
  rows.push([])
  rows.push([surveyName + ' Generated Report'])
  rows.push(["Requested on : "+new Date().toLocaleDateString()]);
  queses.push("Sent Date and Time");
  questions.forEach((question) => {
    surveyType != "REGULAR" ? queses.push(question.questionText) : queses.push(question.questionText[0].text)
  });
  rows.push(queses);
  responses.forEach((response) => {
    let anses = [];
    anses.push(response.sentDate.toISOString().split('T')[0]);
    response.answers.forEach((answer) => {
      anses.push(properDisplay(answer, questions, surveyType));
    })
    rows.push(anses);
  })
  return rows;
}

const exportToXLSX = (Jdata, fileName) => {
  const ws = XLSX.utils.aoa_to_sheet(Jdata);
  var wscols = [
    {wch: 30},
    {wch: 20},
  ];

  ws['!cols'] = wscols;
  for (const [key, value] of Object.entries(ws)) {
    // Set Question Row Style
    if ((key.length == 2 && key.charAt(1) == '4')) {
      ws[key].s = { // set the style for target cell
        font: {
          bold: true
        },
      };
    }
    // Set Links Style
    if ((ws[key].v+'').includes(process.env.FILE_SERVER_URL) || (ws[key].v+'').includes("https://maps.google")){
      if (!(ws[key].v+'').includes(',')){
        ws[key].l = { Target: ws[key].v, Tooltip: "View" };
      }
      ws[key].s = { 
        font: {
          underline: true
        },
        color: {rgb: "FF0000FF"}
      };
    }
    // Set Number Format
    if (!isNaN(Number(ws[key].v))) {
      ws[key].v = Number(ws[key].v)
      ws[key].t = 'n'
    }
    // Set Date Format
    if ((ws[key].v+'')[4] == '-' && (ws[key].v+'')[7] == '-' && (ws[key].v+'').length == 16) {
      ws[key].t = 'd'
    }
    // Set Excel Title style
    ws["A2"].s = { // set the style for target cell
      font: {
        name:"Arial",
        sz: 24,
        bold: true,
      },
    };
  }
  const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
  XLSX.writeFile(wb, `temp/${fileName}.xlsx`);
}

module.exports = {
  translateIds,
  PrepareForDisp,
  filterResponsesByTime,
  formatDataForExcel,
  exportToXLSX
}