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

const filterResponses = async (responses, from, to, at) => {
  var enumr = [];
  var resp = [];
  var modifiedResp = responses;
  for (let index = 0; index < responses.length; index++) {
    if (resp.includes(responses[index]._id)) {
      modifiedResp[index].enumratorName = enumr[resp.findIndex((rsp) => rsp == responses[index]._id)];
    }
    else {
      var res = await GetMember(responses[index].enumratorId);
      resp.push(responses[index]._id);
      enumr.push(res.firstName+' '+res.lastName);
      modifiedResp[index].enumratorName = res.firstName+' '+res.lastName;
    }      
  }
  console.log(new Date(at));
  if (from !== undefined && to !== undefined) {
    return modifiedResp.filter((resp) => (new Date(resp.sentDate).getTime() > new Date(from).getTime()) &&  (new Date(resp.sentDate).getTime() < new Date(to).getTime()));
  }
  else if (from !== undefined) {
    return modifiedResp.filter((resp) => (new Date(resp.sentDate).getTime() > new Date(from).getTime()));
  }
  else if (at !== undefined) {
    return modifiedResp.filter((resp) => (new Date(resp.sentDate).setHours(0,0,0,0).valueOf() === new Date(at).setHours(0,0,0,0)).valueOf());
  }
  else
    return modifiedResp.sort(function(a,b) { return new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime() } );
}

const formatData = (questions, responses) => {
  var rows = [];
  var queses = [];
  rows.push(["Requested on : "+new Date().toLocaleDateString()]);
  queses.push("Enumrator Name");
  queses.push("Sent From");
  queses.push("Sent Date and Time");
  questions.forEach((question) => {
    queses.push(question.questionText)
  });
  rows.push(queses);
  responses.forEach((response) => {
    let anses = [];
    anses.push(response.enumratorName);
    anses.push(response.geoPoint);
    anses.push(response.sentDate);
    response.answers.forEach((answer) => {
      anses.push(properDisplayString(answer));
    })
    rows.push(anses);
  })
  return rows;
}

const properDisplayString = (answer) => {
  if (translateIds('ID', answer.inputType) == 'CHOICE' || translateIds('ID', answer.inputType) == 'MULTI-SELECT') {
    return getAnswer(answer.answer)
  }
  else if (translateIds('ID', answer.inputType) == 'MULTI-PHOTO' || translateIds('ID', answer.inputType) == 'MULTI-FILE') {
    if (typeof answer.answer === 'object') {
      var paths = answer.answer;
      var out_p = "";
      paths.map((path) => {
        out_p = out_p.concat(`${process.env.FILE_SERVER_URL+encryptPath(path)} ,`)
      })
      return out_p
    }
    else if (typeof answer.answer === 'string') {
      return `${process.env.FILE_SERVER_URL+encryptPath(answer.answer)}`
    }
  }
  else if (translateIds('ID', answer.inputType) == 'PHOTO' || translateIds('ID', answer.inputType) == 'FILE') {
    return `${process.env.FILE_SERVER_URL+encryptPath(answer.answer)}`
  }
  else if (translateIds('ID', answer.inputType) == 'GEO-POINT' || translateIds('ID', answer.inputType) == 'MULTI-GEO-POINT') {
    if (typeof answer.answer === 'object') {
      var locs = answer.answer;
      var out_g = ""
      locs.map((loc) => {
        out_g = out_g.concat(`https://maps.google.com/?q=${(loc).split(',')[0]},${(loc).split(',')[1]} ,`)
      })
      return out_g
    }
    else if (typeof answer.answer === 'string') {
      return `https://maps.google.com/?q=${(answer.answer).split(',')[0]},${(answer.answer).split(',')[1]}`
    }
  }
  else {
    if (typeof answer.answer === 'object') {
      var anses = answer.answer;
      var out_pl = "";
      anses.map((plain_answer) => (
        out_pl = out_pl.concat(plain_answer+' ,')
      ))
      return out_pl
    }
    else if (typeof answer.answer === 'string') {
      return answer.answer
    }
  }
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
    if ((key.length == 2 && key.charAt(1) == '2')) {
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
  }
  const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
  XLSX.writeFile(wb, `temp/${fileName}.xlsx`);
}

module.exports = {
  formatData,
  translateIds,
  filterResponses,
  exportToXLSX
}