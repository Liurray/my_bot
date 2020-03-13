// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
// The Firebase Admin SDK to access the Firebase Realtime Database.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
    credential:admin.credential.applicationDefault(),
    databaseURL: 'ws://project-weatherbot.firebaseio.com/'
});

process.env.DEBUG = 'dialogflow:debug'; 

const https = require('https');
const info = functions.config().info;
  //主程式
exports.WebhookApi = functions.https.onRequest((request, response) => {
    var intent = request.body.queryResult.intent.displayName;
    const city = request.body.queryResult.parameters["taiwan_city"];
    console.log(city);
    
    //呼叫紀錄資料庫
    function handleSaveNote(){
        
        const text = request.body.queryResult.parameters.note;
        admin.database().ref('data').push({
            text: text
        });
        
        return;

    }
    function handleReadNote(){
        var record = '====你之前所記錄的事項有:====';
        admin.database().ref('data').on('value',function(firebase_Data){
            var data = firebase_Data.val();
            if(data !==null){
            var keys = Object.keys(data);
                for(var i = 0; i <keys.length;i++){
                    var k = keys[i];
                    var text = data[k].text;
                    record = `${record}\n${i+1}.${text}`;    
                }
                    return  response.json({ 'fulfillmentText':record});

            }
            else{
                return  response.json({ 'fulfillmentText':'目前沒有所記錄的事項'});
            }
        });
        

    }
    function handledelNote(){
            admin.database().ref('data').remove()
            return  
    }
    //呼叫天氣api
    function CallWeather(){
        var url = 'https://opendata.cwb.gov.tw/fileapi/v1/opendataapi/F-C0032-001?Authorization=CWB-0B80A622-691E-4CF9-BCD0-52256C5A8799&format=JSON';
            https.get(url, function(res){
                const user =`${city}`;
                var index = -1;
                var body = '';
                res.on('data', function(chunk){
                    body += chunk;
                });
                res.on('end', function(){
                    var ObjectData = JSON.parse(body);
                    let location = ObjectData.cwbopendata.dataset.location;
                    var findCity = location.find((item, i = 0) => {
                        if(item.locationName ===user){
                        index = i
                        return index;
                        }
                        
                    });
                    
                    //const City_result = location.filter(location => location.locationName === user); //*city要轉為一個str
                    response.json({ 'fulfillmentText':  `${location[index].locationName} 目前 
                    \n最高溫: ${location[index].weatherElement[1].time[0].parameter.parameterName}度。 最低溫 : ${location[index].weatherElement[2].time[0].parameter.parameterName}
                    \n氣候狀況 : ${location[index].weatherElement[0].time[2].parameter.parameterName}
                    \n舒適度為 : ${location[index].weatherElement[3].time[0].parameter.parameterName}
                    \n降雨機率為 : ${location[index].weatherElement[4].time[0].parameter.parameterName} %`});
                    return;
                });
            }).on('error', function(e){
                console.log("Got an error: ", e);
            }); 
    }
        //使用者intent是甚麼
        switch(intent){
            case 'Ask_for_Weather':
                CallWeather();

                break;
            case 'getNote':
                handleSaveNote();
                response.json({ 'fulfillmentText': `已經幫你記錄好咯`});

                break;
            case 'ReadNote':
                handleReadNote();

                break;    
            case 'delNote':
                handledelNote();
                response.json({ 'fulfillmentText':`好的，都幫你清除了今日紀錄事項咯`});
                break;    
            default:  
                response.json({ 'fulfillmentText': `不太清楚你想說甚麼，可以詳細一點嗎?` });

                break;
        }




});

    
  
 
    

