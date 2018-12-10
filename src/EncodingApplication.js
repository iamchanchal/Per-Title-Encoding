var inputVideoFile = "../resource/CosmosLaundromat2min.mp4";
var commonName = inputVideoFile.split('resource/')[1].split('.')[0];
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var chartFile="";
var excelFile = "";

var psnrBitrateList = new Array(35);
for (var i = 0; i < 35; i++) {
    psnrBitrateList[i] = new Array(2);
}
var width; var height; var resolution;
ffmpeg.ffprobe(inputVideoFile, function(err, metadata) {
    width = metadata.streams[0].width;
    height = metadata.streams[0].height;
    resolution = width + "x" + height;
});

var jsonFile = "../resource/reverse/"+commonName+"json2.txt"; //saves all the psnr-bitrate points

function processingInputFile(i,length,breadth,psnrBitrateCounter){
    var outputVideoFile = "../resource/reverse/"+commonName+"IntermediateCRFEncoding"+length+"x"+breadth+"_"+i+".mp4";
    var y4mOutput = "../resource/reverse/"+commonName+"y4mOutput"+length+"x"+breadth+"_"+i+".y4m";


//saving console log message in a text file
    var logFileName = "../resource/log"+commonName+length+"x"+breadth+"_"+i+".txt";

    var util = require('util');
    var logFile = fs.createWriteStream(logFileName, { flags: 'a' });
    var logStdout = process.stdout;
    console.log = function () {
        logFile.write(util.format.apply(null, arguments) + '\n');
        logStdout.write(util.format.apply(null, arguments) + '\n');
    }
    console.error = console.log;

//CRF encoding the input file by downscaling
    var crf = "-crf "+i;
    var resolution = length+"x"+breadth;
    var encoding = ffmpeg(inputVideoFile)
        .size(resolution)
        .addOption(crf)
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function(progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err,stdout, stderr) {
            console.log('Processing CRF encoding finished !');
            console.log(JSON.stringify(stdout, null, " "));
            y4mcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter);
        })
        .save(outputVideoFile);
}

//Converting the CRF encoded file to y4m by upscaling to the original video
function y4mcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter) {
    var y4mConversion = ffmpeg(outputVideoFile)
        .addOption('-pix_fmt')
        .addOption('yuv420p')
        .addOptions('-vsync', '0', '-s', resolution)
        .outputOption('-sws_flags lanczos')
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function (progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err, stdout, stderr) {
            console.log('Processing CRF encoding finished !');
            console.log(JSON.stringify(stdout, null, " "));
            psnrcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter);
        })
        .save(y4mOutput);
}

//method to calculate and print PSNR
function psnrcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter) {
    var psnrAfter = ffmpeg(inputVideoFile)
        .input(y4mOutput)
        .complexFilter(['psnr'])
        .addOption('-f', 'null')
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function (progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err, stdout, stderr, metadata) {
            console.log('Processing for PSNR finished !');

            console.log(JSON.stringify(stdout, null, " "));
            var averagePSNR = JSON.stringify(stdout, null, " ").match("y:(.*)u:");
            var fs = require("fs");
            var jsonstream = fs.createWriteStream(jsonFile, {flags: 'a'});
            ffmpeg.ffprobe(outputVideoFile, function(err, metadata) {
                psnrBitrateList[psnrBitrateCounter][0] = metadata.streams[0].bit_rate;
                psnrBitrateList[psnrBitrateCounter][1] = parseFloat(averagePSNR[1]);
                jsonstream.write("PSNR"+length+"x"+breadth+"_"+i+":"+psnrBitrateList[psnrBitrateCounter][0] + "...Bitrate"+length+"x"+breadth+"_"+i+":"+ psnrBitrateList[psnrBitrateCounter][1] + "\n");
                deleteUnusedFile(y4mOutput);
                if(psnrBitrateCounter==34){
                    printHullPoints();
                }
                if (!fs.existsSync(y4mOutput)) {
                    keepItRunning(i,length,breadth,psnrBitrateCounter);
                }
            });
        })
        .output('nowhere')
        .run();
}

//Encoding input file from CRF 18 to 53 for 480p,720p and 1080p
function keepItRunning(i,length,breadth,psnrBitrateCounter){
    if(length==320&&breadth==240&&i==54){
        length=384; breadth=288;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==384&&breadth==288&&i==54)
    {
        length=512; breadth=384;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==512&&breadth==384&&i==54)
    {
        length=640; breadth=480;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==640&&breadth==480&&i==54)
    {
        length=720; breadth=480;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==720&&breadth==480&&i==54)
    {
        length=1280; breadth=720;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==1280&&breadth==720&&i==54)
    {
        length=1920; breadth=1080;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if (length==1920&&breadth==1080&&i==54) {
        return 1;
    }
    else{
        processingInputFile(i+9,length,breadth,psnrBitrateCounter+1);
    }



}

function deleteUnusedFile(file) {
    var fs = require("fs");
    fs.unlinkSync(file);
}

//method to create chart with convex hull and bitrate ladder with optimal points
function printHullPoints() {
    var fs = require("fs");

    var hull = require('../lib/hull.js');
    var hullPoints = new Array(hull(psnrBitrateList,Infinity));

    var hullFile = "../resource/reverse/"+commonName+"Hull2.txt";
    fs.writeFile(hullFile, '', function () {
        console.log('done overwriting contents of hull file if it exists!')
    });

    var hullstream = fs.createWriteStream(hullFile, {flags: 'a'});

    hullstream.write("Here come the Hull Points");
    console.log("Here come the Hull Points");
    console.log("length of hull points returned by original hull method:: "+hullPoints.length);
    for (var r = 0; r < hullPoints.length; r++) {
        hullstream.write("\n"+ "value of r::"+r);
        for (var k = 0; k < hullPoints[r].length; k++) {
            hullstream.write("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);
            console.log("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);

        }

    }

    var hull2D = new Array(hullPoints.length);
    for (var i = 0; i < hullPoints[0].length; i++) {
        hull2D[i] = new Array(2);
        hull2D[i][0] = hullPoints[0][i][0];
        hull2D[i][1] = hullPoints[0][i][1];
    }
    //popping the redundant convex hull point from the list
    hull2D.pop();

    var arr240 = new Array(5);
    var arr288 = new Array(5);
    var arr384 = new Array(5);
    var arr640x480 = new Array(5);
    var arr720x480 = new Array(5);
    var arr720 = new Array(5);
    var arr1080 = new Array(5);

    for (var i = 0; i < 5; i++) {
        arr240[i] = new Array(2);
        arr288[i] = new Array(2);
        arr384[i] = new Array(2);
        arr640x480[i] = new Array(2);
        arr720x480[i] = new Array(2);
        arr720[i] = new Array(2);
        arr1080[i] = new Array(2);
    }

    for(var i=0;i<5;i++){
        arr240[i][0]=psnrBitrateList[i][0];
        arr240[i][1]=psnrBitrateList[i][1];
    }
    for(var i=0,j=5;i<5;i++,j++){
        arr288[i][0]=psnrBitrateList[j][0];
        arr288[i][1]=psnrBitrateList[j][1];
    }
    for(var i=0,k=9;i<5;i++,k++){
        arr384[i][0]=psnrBitrateList[k][0];
        arr384[i][1]=psnrBitrateList[k][1];
    }
    for(var i=0,k=14;i<5;i++,k++){
        arr640x480[i][0]=psnrBitrateList[k][0];
        arr640x480[i][1]=psnrBitrateList[k][1];
    }
    for(var i=0,k=18;i<5;i++,k++){
        arr720x480[i][0]=psnrBitrateList[k][0];
        arr720x480[i][1]=psnrBitrateList[k][1];
    }
    for(var i=0,k=22;i<5;i++,k++){
        arr720[i][0]=psnrBitrateList[k][0];
        arr720[i][1]=psnrBitrateList[k][1];
    }
    for(var i=0,k=26;i<5;i++,k++){
        arr1080[i][0]=psnrBitrateList[k][0];
        arr1080[i][1]=psnrBitrateList[k][1];
    }


    //sorting the arrays for highcharts
    arr240 = arr240.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr288 = arr288.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr384 = arr384.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr640x480 = arr640x480.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr720x480 = arr720x480.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr720 = arr720.sort(function(a,b) {
        return a[0] - b[0];
    });
    arr1080 = arr1080.sort(function(a,b) {
        return a[0] - b[0];
    });
    hull2D = hull2D.sort(function(a,b) {
        return a[0] - b[0];
    });

    for(var i = 0; i < arr240.length; i++) {
        for(var z = 0; z < arr240[i].length; z++) {
            console.log("240p "+arr240[i][z]);
        }
    }
    for(var i = 0; i < arr288.length; i++) {
        for(var z = 0; z < arr288[i].length; z++) {
            console.log("288p "+arr288[i][z]);
        }
    }
    for(var i = 0; i < arr384.length; i++) {
        for(var z = 0; z < arr384[i].length; z++) {
            console.log("384p "+arr384[i][z]);
        }
    }
    for(var i = 0; i < arr640x480.length; i++) {
        for(var z = 0; z < arr640x480[i].length; z++) {
            console.log("640x480p "+arr640x480[i][z]);
        }
    }
    for(var i = 0; i < arr720x480.length; i++) {
        for(var z = 0; z < arr720x480[i].length; z++) {
            console.log("720x480p "+arr720x480[i][z]);
        }
    }
    for(var i = 0; i < arr720.length; i++) {
        for(var z = 0; z < arr720[i].length; z++) {
            console.log("720p "+arr720[i][z]);
        }
    }
    for(var i = 0; i < arr1080.length; i++) {
        for(var z = 0; z < arr1080[i].length; z++) {
            console.log("1080p "+arr1080[i][z]);
        }
    }
    for(var i = 0; i < hull2D.length; i++) {
        for(var z = 0; z < hull2D[i].length; z++) {
            console.log("Hull "+hull2D[i][z]);
        }
    }

   var htmlData = "<html>\n" +
        "<head>\n" +
        "    <title>Encoding plots for "+commonName+"</title>\n" +
        "\n" +
        "    <meta charset=\"UTF-8\">\n" +
        "\n" +
        "    <link rel=\"stylesheet\" type=\"text/css\" href=\"bower_components/bootstrap/dist/css/bootstrap.min.css\" />\n" +
        "   \n" +
        "</head>\n" +
        "<body>\n" +
        "<div class=\"container\">\n" +
        "    <h1>Encoding plots for "+commonName+"</h1>\n" +
        "\n" +
        "    <div class=\"highcharts-container\" id=\"encodedChart\"></div>\n" +
        "\n" +
        "\n" +
        "    <script src=\"bower_components/jquery/dist/jquery.min.js\"></script>\n" +
        "    <script src=\"bower_components/highcharts/highcharts.js\"></script>\n" +
        "    <script src=\"bower_components/highcharts/modules/exporting.js\"></script>\n" +
        "    <script src=\"bower_components/highcharts/modules/canvas-tools.js\"></script>\n" +
        "    <script src=\"bower_components/export-csv/export-csv.js\"></script>\n" +
        "    <script src=\"bower_components/jspdf/dist/jspdf.min.js\"></script>\n" +
        "\n" +
        "    <script src=\"bower_components/highcharts-export-clientside/highcharts-export-clientside.js\"></script>\n" +
        "\n" +
        "    <script>\n" +
        "        $(\".browser-support *[data-type]\").each(function() {\n" +
        "            var jThis = $(this);\n" +
        "            if(Highcharts.exporting.supports(jThis.data(\"type\"))) {\n" +
        "                jThis.addClass(\"text-success\");\n" +
        "                jThis.html('<span class=\"glyphicon glyphicon-ok\"></span>');\n" +
        "            }\n" +
        "            else {\n" +
        "                jThis.addClass(\"text-danger\");\n" +
        "                jThis.html('<span class=\"glyphicon glyphicon-remove\"></span>');\n" +
        "            }\n" +
        "        });\n" +
        "    </script>\n" +
        "\n" +
        "    <script>\n" +
        "        $('#encodedChart').highcharts({\n" +
        "            title: {\n" +
        "                text: 'Bitrate-PSNR'\n" +
        "\n" +
        "            },\n" +
        "            chart: {\n" +
        "                type: 'spline'\n" +
        "\n" +
        "            },\n" +
        "            xAxis: {title: {\n" +
        "                    text: 'BITRATE'\n" +
        "                }\n" +
        "\n" +
        "            },\n" +
        "            yAxis: {\n" +
        "                title: {\n" +
        "                    text: 'PSNR'\n" +
        "                },\n" +
        "                plotLines: [{\n" +
        "                    value: 0,\n" +
        "                    width: 1\n" +
        "\n" +
        "                }]\n" +
        "            },\n" +
        "            legend: {\n" +
        "                layout: 'vertical',\n" +
        "                align: 'right',\n" +
        "                verticalAlign: 'middle',\n" +
        "                borderWidth: 0\n" +
        "            },\n" +
        "            colors: ['#FF2714', '#FFFB37','#71FF27','#3C8EFF','#FF30B0','#ED6E12','#4BFFD3','#FF2EEC'],\n" +
        "            series: [{\n" +
        "                name: '240p',\n" +
        "                data:"+JSON.stringify(arr240)+"\n" +
        "            }, {\n" +
        "                name: '288p',\n" +
        "                data:"+JSON.stringify(arr288)+"\n" +
        "            }, {\n" +
        "                name: '384p',\n" +
        "                data:"+JSON.stringify(arr384)+"\n" +
        "            }, {\n" +
        "                name: '640x480p',\n" +
        "                data:"+JSON.stringify(arr640x480)+"\n" +
        "            }, {\n" +
        "                name: '720x480p',\n" +
        "                data:"+JSON.stringify(arr720x480)+"\n" +
        "            }, {\n" +
        "                name: '720p',\n" +
        "                data:"+JSON.stringify(arr720)+"\n" +
        "            }, {\n" +
        "                    name: '1080p',\n" +
        "                    data:"+JSON.stringify(arr1080)+"\n" +
        "                }, {\n" +
        "                    name: 'Convex Hull',\n" +
        "                    data:"+JSON.stringify(hull2D)+"\n" +
        "                }],\n" +
       "            exporting: {\n" +
       "                filename: '"+commonName+"'\n" +
       "\n" +
       "            }\n" +
        "        });\n" +
        "    </script>\n" +
        "\n" +
        "</div>\n" +
        "</body>\n" +
        "</html>";


    chartFile=commonName+"2.html";
    fs.writeFile(chartFile,htmlData, function () {
        console.log('Wrote html file');
    });


    /***************Printing the bitrate ladder in an excel file*********************/
   /* var excelbuilder = require('msexcel-builder');

    excelFile = commonName+".xlsx";
    var workbook = excelbuilder.createWorkbook('./',excelFile);

    var bitrateLadderArray = new Array(3);
    for (var x=0;x<3;x++){
        bitrateLadderArray[x] = new Array(3);
    }

    var arr480min = Math.abs(arr480[0][0]-hull2D[0][0]);
    for(var x = 0; x < arr480.length; x++){
        var counter = 0;
        for(var y = 0; y < hull2D.length; y++){
            if(arr480[x][0] == hull2D[y][0] && arr480[x][1] == hull2D[y][1]){
                bitrateLadderArray[0][0]= "480p";
                bitrateLadderArray[0][1]=hull2D[y][0];
                bitrateLadderArray[0][2]=hull2D[y][1];
                counter++;
                break;
            }
            else if((Math.abs(arr480[x][0]-hull2D[y][0])<arr480min)){
                bitrateLadderArray[0][0]= "480p";
                if(hull2D[y][1]>arr480[x][1]) {
                    bitrateLadderArray[0][1] = hull2D[y][0];
                    bitrateLadderArray[0][2] = hull2D[y][1];
                }else{
                    bitrateLadderArray[0][1] = arr480[x][0];
                    bitrateLadderArray[0][2] = arr480[x][1];
                }
            }
        }
        if(counter!=0){
            break;
        }
    }
    console.log("New bitrate for 480p: "+bitrateLadderArray[0][1]+","+bitrateLadderArray[0][2]);

    var arr720min = Math.abs(arr720[0][0]-hull2D[0][0]);
    for(var x = 0; x < arr720.length; x++){
        var counter = 0;
        for(var y = 0; y < hull2D.length; y++){
            if(arr720[x][0] == hull2D[y][0] && arr720[x][1] == hull2D[y][1]){
                bitrateLadderArray[1][0]= "720p";
                bitrateLadderArray[1][1]=hull2D[y][0];
                bitrateLadderArray[1][2]=hull2D[y][1];
                counter++;
                break;
            }
            else if((Math.abs(arr720[x][0]-hull2D[y][0])<arr720min)){
                bitrateLadderArray[1][0]= "720p";
                if(hull2D[y][1]>arr720[x][1]) {
                    bitrateLadderArray[1][1] = hull2D[y][0];
                    bitrateLadderArray[1][2] = hull2D[y][1];
                }else{
                    bitrateLadderArray[1][1] = arr720[x][0];
                    bitrateLadderArray[1][2] = arr720[x][1];
                }
            }
        }
        if(counter!=0){
            break;
        }
    }
    console.log("New bitrate for 720p: "+bitrateLadderArray[1][1]+","+bitrateLadderArray[1][2]);

    var arr1080min = Math.abs(arr1080[0][0]-hull2D[0][0]);
    for(var x = 0; x < arr1080.length; x++){
        var counter = 0;
        for(var y = 0; y < hull2D.length; y++){
            if(arr1080[x][0] == hull2D[y][0] && arr1080[x][1] == hull2D[y][1]){
                bitrateLadderArray[2][0]= "1080p";
                bitrateLadderArray[2][1]=hull2D[y][0];
                bitrateLadderArray[2][2]=hull2D[y][1];
                counter++;
                break;
            }else if((Math.abs(arr1080[x][0]-hull2D[y][0])<arr1080min)){
                bitrateLadderArray[2][0]= "720p";
                if(hull2D[y][1]>arr1080[x][1]) {
                    bitrateLadderArray[2][1] = hull2D[y][0];
                    bitrateLadderArray[2][2] = hull2D[y][1];
                }else{
                    bitrateLadderArray[2][1] = arr720[x][0];
                    bitrateLadderArray[2][2] = arr720[x][1];
                }
            }
        }
        if(counter!=0){
            break;
        }
    }
    console.log("New bitrate for 1080p: "+bitrateLadderArray[2][1]+","+bitrateLadderArray[2][2]);

    console.log(bitrateLadderArray);

    var sheet1 = workbook.createSheet('sheet1', 4, 4);
    sheet1.set(1, 1, 'Quality');
    sheet1.set(2, 1, 'Bitrate');
    sheet1.set(3, 1, 'PSNR');
    for (var row = 0; row < 3; row++) {
        for(var col=0;col<3;col++)
            sheet1.set(col+1, row+2, bitrateLadderArray[row][col]);
    }

    workbook.save(function(err){
        if (err)
            throw err;
        else
            console.log('The Bitrate ladder was successfully created and saved in an excel file');
    });*/
    /**********excel printing finished**************************/
}

var express = require('express');
var app = express();
var path = require('path');

app.use(express.static('public'));
app.use(express.static('images'));

app.get('/start', function(req, res){
    res.send("Encoding has begun..");
    processingInputFile(18,320,240,0);
});


app.get('/chart', function(req, res){
    res.sendFile(path.join(__dirname + '/'+chartFile));
});

/*app.get('/bitrateladder', function(req, res){
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + excelFile);
    res.sendFile(path.join(__dirname + '/'+excelFile));
});*/

app.listen(3000);