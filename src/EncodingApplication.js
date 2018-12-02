



var inputVideoFile = "../resource/Fantastic_Four_2015_Trailer_3_Intl_5.1-1080p-HDTN.mp4";
var commonName = inputVideoFile.split('resource/')[1].split('.')[0];
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var chartFile="";
var excelFile = "";

var psnrBitrateList = new Array(24);
for (var i = 0; i < 24; i++) {
    psnrBitrateList[i] = new Array(2);
}
var width; var height; var resolution;
ffmpeg.ffprobe(inputVideoFile, function(err, metadata) {
    width = metadata.streams[0].width;
    height = metadata.streams[0].height;
    resolution = width + "x" + height;
});

var jsonFile = "../resource/reverse/"+commonName+"json1.txt"; //saves all the psnr-bitrate points

function processingInputFile(i,length,breadth,psnrBitrateCounter){
    var outputVideoFile = "../resource/reverse/"+commonName+"IntermediateCRFEncoding"+length+"x"+breadth+"_"+i+".mp4";
    var y4mOutput = "../resource/reverse/"+commonName+"y4mOutput"+length+"x"+breadth+"_"+i+".y4m";


//saving console log message in a text file
 //   var logFile = "../resource/log"+commonName+length+"x"+breadth+"_"+i+".txt";

    var util = require('util');
 //   var logFile = fs.createWriteStream(logFile, { flags: 'a' });
    var logStdout = process.stdout;
    console.log = function () {
       // logFile.write(util.format.apply(null, arguments) + '\n');
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
            //rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter);
            psnrcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter);
        })

        .save(y4mOutput);
}
//Converting raw y4m file to mp4 upscaling
/*function rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter) {
    var finalOutput = "../resource/reverse/"+commonName+"FinalUpscaledOutput"+length+"x"+breadth+"_"+i+".mp4";
    var rawToMP4 = ffmpeg(y4mOutput)
        .addOption('-c:v libx264')
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
            //deleteUnusedFile(outputVideoFile);
            psnrcal(i,length,breadth,outputVideoFile,y4mOutput,finalOutput,psnrBitrateCounter);

        })

        .save(finalOutput);
}*/
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
            var psnrFile = "../resource/reverse/"+commonName+"1PSNR"+length+"x"+breadth+"_"+i+".txt";
            var jsonstream = fs.createWriteStream(jsonFile, {flags: 'a'});
            ffmpeg.ffprobe(outputVideoFile, function(err, metadata) {
                psnrBitrateList[psnrBitrateCounter][0] = metadata.streams[0].bit_rate;
                psnrBitrateList[psnrBitrateCounter][1] = parseFloat(averagePSNR[1]);
                jsonstream.write("PSNR"+length+"x"+breadth+"_"+i+":"+psnrBitrateList[psnrBitrateCounter][0] + "...Bitrate"+length+"x"+breadth+"_"+i+":"+ psnrBitrateList[psnrBitrateCounter][1] + "\n");
                deleteUnusedFile(y4mOutput);
               // deleteUnusedFile(finalOutput);
                if(psnrBitrateCounter==23){
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
    if(length==640&&breadth==480&&i==53){
        length=1080; breadth=720;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if(length==1080&&breadth==720&&i==53)
    {
        length=1920; breadth=1080;i=18;
        processingInputFile(i,length,breadth,psnrBitrateCounter+1);
    }
    else if (length==1920&&breadth==1080&&i==53) {
        return 1;
    }
    else{
        processingInputFile(i+5,length,breadth,psnrBitrateCounter+1);
    }



}

function deleteUnusedFile(file) {
    var fs = require("fs");
    fs.unlinkSync(file);
}

//method to create chart with convex hull
function printHullPoints() {
    var fs = require("fs");

    var hull = require('../lib/hull.js');
    var hullPoints = new Array(hull(psnrBitrateList,Infinity));



    var hullFile = "../resource/reverse/"+commonName+"Hull.txt";
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

    var arr480 = new Array(8);
    var arr720 = new Array(8);
    var arr1080 = new Array(8);
    for (var i = 0; i < 8; i++) {
        arr480[i] = new Array(2);
        arr720[i] = new Array(2);
        arr1080[i] = new Array(2);
    }

    for(var i=0;i<8;i++){
        arr480[i][0]=psnrBitrateList[i][0];
        arr480[i][1]=psnrBitrateList[i][1];
    }
    for(var i=0,j=8;i<8;i++,j++){
        arr720[i][0]=psnrBitrateList[j][0];
        arr720[i][1]=psnrBitrateList[j][1];
    }
    for(var i=0,k=16;i<8;i++,k++){
        arr1080[i][0]=psnrBitrateList[k][0];
        arr1080[i][1]=psnrBitrateList[k][1];
    }

    //sorting the arrays for highcharts
    arr480 = arr480.sort(function(a,b) {
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

    //print all the arrays to check if they are in ascending order
    for(var i = 0; i < arr480.length; i++) {
        for(var z = 0; z < arr480[i].length; z++) {
            console.log("480p "+arr480[i][z]);
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



    /***************Printing the bitrate ladder in an excel file*********************/
    var excelbuilder = require('msexcel-builder');

    excelFile = commonName+".xlsx";
    var workbook = excelbuilder.createWorkbook('./',excelFile);


   // var arr480 = [[28945,28.490706],[38651,30.090431],[60769,32.572187],[96959,34.725321],[159917,36.473845],[273488,37.825566],[491002,38.745833],[942362,39.311826]];

  //  var arr720 = [[62902,29.795643],[84558,31.715869],[130925,34.690483],[205902,37.368279],[336355,39.741429],[575913,41.767758],[1071436,43.34032],[2245851,44.430976]];

 //   var arr1080 = [[150743,31.114414],[200386,33.311901],[307115,36.719714],[471994,39.833949],[764677,42.694389],[1342789,45.292969],[2717142,47.547582],[6331813,49.630586]];

//    var hull2D = [[28945,28.490706],[38651,30.090431],[60769,32.572187],[96959,34.725321],[159917,36.473845],[205902,37.368279],[336355,39.741429],[575913,41.767758],[764677,42.694389],[1342789,45.292969],[2717142,47.547582],[6331813,49.630586]];

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
    });
    /**********excel printing finished**************************/


    /***************Highchart Start**********************/
 //   var jsdom = require('jsdom');
/*    var htmlData2 = `<html>
<head>
    <title>Highcharts Client-Side Export module</title>

    <meta charset="UTF-8">

    <link rel="stylesheet" type="text/css" href="bower_components/bootstrap/dist/css/bootstrap.min.css" />
   
</head>
<body>
<div class="container">
    <h1>Highcharts Client-Side Export module</h1>

    <div class="highcharts-container" id="example-1"></div>

    <script src="bower_components/jquery/dist/jquery.min.js"></script>
    <script src="bower_components/highcharts/highcharts.js"></script>
    <script src="bower_components/highcharts/modules/exporting.js"></script>
    <script src="bower_components/highcharts/modules/canvas-tools.js"></script>
    <script src="bower_components/export-csv/export-csv.js"></script>
    <script src="bower_components/jspdf/dist/jspdf.min.js"></script>

    <script src="bower_components/highcharts-export-clientside/highcharts-export-clientside.js"></script>

    <script>
        $(".browser-support *[data-type]").each(function() {
            var jThis = $(this);
            if(Highcharts.exporting.supports(jThis.data("type"))) {
                jThis.addClass("text-success");
                jThis.html('<span class="glyphicon glyphicon-ok"></span>');
            }
            else {
                jThis.addClass("text-danger");
                jThis.html('<span class="glyphicon glyphicon-remove"></span>');
            }
        });
    </script>

    <script>
        $('#example-1').highcharts({
            chart: {
                type: 'spline'
            },
            title: {
                text: 'Bitrate-PSNR'

            },
            xAxis: {title: {
                    text: 'BITRATE'
                }

            },
            yAxis: {
                title: {
                    text: 'PSNR'
                },
                plotLines: [{
                    value: 0,
                    width: 1

                }]
            },
            tooltip: {
                valueSuffix: '°C'
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            colors: ['#FF2714', '#FFFB37','#71FF27','#3C8EFF'],
            series: [{
                name: '480p',
                data:${arr480}
            }, {
                name: '720p',
                data:${arr720}
            }, {
                    name: '1080p',
                    data:${arr1080}
                }, {
                    name: 'Convex Hull',
                    data:${hull2D}
                }]
        });
    </script>

</div>
</body>
</html>`;*/
   var htmlData = "<html>\n" +
        "<head>\n" +
        "    <title>Highcharts Client-Side Export module</title>\n" +
        "\n" +
        "    <meta charset=\"UTF-8\">\n" +
        "\n" +
        "    <link rel=\"stylesheet\" type=\"text/css\" href=\"bower_components/bootstrap/dist/css/bootstrap.min.css\" />\n" +
        "   \n" +
        "</head>\n" +
        "<body>\n" +
        "<div class=\"container\">\n" +
        "    <h1>Highcharts Client-Side Export module</h1>\n" +
        "\n" +
        "    <div class=\"highcharts-container\" id=\"example-1\"></div>\n" +
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
        "        $('#example-1').highcharts({\n" +
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
        "            colors: ['#FF2714', '#FFFB37','#71FF27','#3C8EFF'],\n" +
        "            series: [{\n" +
        "                name: '480p',\n" +
        "                data:"+JSON.stringify(arr480)+"\n" +
        "            }, {\n" +
        "                name: '720p',\n" +
        "                data:"+JSON.stringify(arr720)+"\n" +
        "            }, {\n" +
        "                    name: '1080p',\n" +
        "                    data:"+JSON.stringify(arr1080)+"\n" +
        "                }, {\n" +
        "                    name: 'Convex Hull',\n" +
        "                    data:"+JSON.stringify(hull2D)+"\n" +
        "                }]\n" +
        "        });\n" +
        "    </script>\n" +
        "\n" +
        "</div>\n" +
        "</body>\n" +
        "</html>";


    chartFile=commonName+"1.html";
    fs.writeFile(chartFile,htmlData, function () {
        console.log('Wrote html file');
    });
     // var  window = document.defaultView;

  /*  document.createElementNS = function (ns, tagName) {
        var elem = document.createElement(tagName);

        // Set private namespace to satisfy jsdom's getter
        elem._namespaceURI = ns; // eslint-disable-line no-underscore-dangle
        /!**
         * Pass Highcharts' test for SVG capabilities
         * @returns {undefined}
         *!/
        elem.createSVGRect = function () {};
        /!**
         * jsdom doesn't compute layout (see https://github.com/tmpvar/jsdom/issues/135).
         * This getBBox implementation provides just enough information to get Highcharts
         * to render text boxes correctly, and is not intended to work like a general
         * getBBox implementation. The height of the boxes are computed from the sum of
         * tspans and their font sizes. The width is based on an average width for each glyph.
         * It could easily be improved to take font-weight into account.
         * For a more exact result we could to create a map over glyph widths for several
         * fonts and sizes, but it may not be necessary for the purpose.
         * @returns {Object} The bounding box
         *!/
        elem.getBBox = function () {
            var lineWidth = 0,
                width = 0,
                height = 0;

            [].forEach.call(elem.children.length ? elem.children : [elem], function (child) {
                var fontSize = child.style.fontSize || elem.style.fontSize,
                    lineHeight,
                    textLength;

                // The font size and lineHeight is based on empirical values, copied from
                // the SVGRenderer.fontMetrics function in Highcharts.
                if (/px/.test(fontSize)) {
                    fontSize = parseInt(fontSize, 10);
                } else {
                    fontSize = /em/.test(fontSize) ? parseFloat(fontSize) * 12 : 12;
                }
                lineHeight = fontSize < 24 ? fontSize + 3 : Math.round(fontSize * 1.2);
                textLength = child.textContent.length * fontSize * 0.55;

                // Tspans on the same line
                if (child.getAttribute('dx') !== '0') {
                    height += lineHeight;
                }

                // New line
                if (child.getAttribute('dy') !== null) {
                    lineWidth = 0;
                }

                lineWidth += textLength;
                width = Math.max(width, lineWidth);

            });

            return {
                x: 0,
                y: 0,
                width: width,
                height: height
            };
        };
        return elem;
    };*/

   /* var Highcharts = require('highcharts');

 var testChart=   Highcharts.Chart('container', {
        chart: {
            type: 'spline'
        },
        title: {
            text: 'PSNR Calculation'
        },
        xAxis: {
            title: {
                text: 'BITRATE'
            }
        },
        yAxis: {
            title: {
                text: 'PSNR'
            }
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e. %b}: {point.y:.2f} m'
        },

        plotOptions: {
            spline: {
                marker: {
                    enabled: true
                }
            }
        },

        colors: ['#6CF', '#39F', '#06C', '#036', '#000'],

        series: [{
            name: "480p",
            data: arr640

        }, {
            name: "720p",
            data: arr720
        }, {
            name: "1080p",
            data: arr1080
        },
            {
                name: "Convex hull",
                data:hull2D
            }]
    });
   document.getElementById('container').innerHTML = testChart;
   var svg = document.getElementById('container').innerHTML;
    var chartFile="../resource/HullCharts/"+commonName+".svg";
    fs.writeFile(chartFile, svg, function () {
        console.log('Wrote ' + svg.length + ' bytes to ' +commonName+'.svg.');
    });*/
    /***************Highchart End*********************/


}

//main function trigerring encoding process
//processingInputFile(18,640,480,0);

var express = require('express');
var app = express();
var path = require('path');

app.use(express.static('public'));
app.use(express.static('images'));

app.get('/', function(req, res){
    res.send("Please enter data");
});

app.get('/start', function(req, res){
    res.send("Start");
    processingInputFile(18,640,480,0);
});


app.get('/chart', function(req, res){
    res.sendFile(path.join(__dirname + '/'+chartFile));
});

app.get('/ladder', function(req, res){
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + excelFile);
    res.sendFile(path.join(__dirname + '/'+excelFile));
});



app.listen(3000);