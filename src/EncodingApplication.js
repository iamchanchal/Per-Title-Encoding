var inputVideoFile = "../resource/TOS30sec.mp4";
var commonName = inputVideoFile.split('resource/')[1].split('.')[0];
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

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

var jsonFile = "../resource/reverse/"+commonName+"json.txt"; //saves all the psnr-bitrate points

function processingInputFile(i,length,breadth,psnrBitrateCounter){
    var outputVideoFile = "../resource/reverse/"+commonName+"IntermediateCRFEncoding"+length+"x"+breadth+"_"+i+".mp4";
    var y4mOutput = "../resource/reverse/"+commonName+"y4mOutput"+length+"x"+breadth+"_"+i+".y4m";


//saving console log message in a text file
    var logFile = "../resource/log"+commonName+length+"x"+breadth+"_"+i+".txt";

    var util = require('util');
    var logFile = fs.createWriteStream(logFile, { flags: 'a' });
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
            rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter);
        })

        .save(y4mOutput);
}
//Converting raw y4m file to mp4 upscaling
function rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter) {
    var finalOutput = "../resource/reverse/finalUpscaledOutput"+commonName+length+"x"+breadth+"_"+i+".mp4";
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
            psnrcal(i,length,breadth,y4mOutput,finalOutput,psnrBitrateCounter);

        })

        .save(finalOutput);
}
//method to calculate and print PSNR
function psnrcal(i,length,breadth,y4mOutput,finalOutput,psnrBitrateCounter) {

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
            var averagePSNR = JSON.stringify(stdout, null, " ").match("average:(.*)min:");
            var fs = require("fs");
            var psnrFile = "../resource/reverse/"+commonName+"PSNR"+length+"x"+breadth+"_"+i+".txt";
            var jsonstream = fs.createWriteStream(jsonFile, {flags: 'a'});
            ffmpeg.ffprobe(finalOutput, function(err, metadata) {
                psnrBitrateList[psnrBitrateCounter][0] = metadata.streams[0].bit_rate;
                psnrBitrateList[psnrBitrateCounter][1] = parseFloat(averagePSNR[1]);
                jsonstream.write("PSNR"+length+"x"+breadth+"_"+i+":"+psnrBitrateList[psnrBitrateCounter][0] + "...Bitrate"+length+"x"+breadth+"_"+i+":"+ psnrBitrateList[psnrBitrateCounter][1] + "\n");
                deleteUnusedFile(y4mOutput);
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

    var arr640 = new Array(8);
    var arr720 = new Array(8);
    var arr1080 = new Array(8);
    for (var i = 0; i < 8; i++) {
        arr640[i] = new Array(2);
        arr720[i] = new Array(2);
        arr1080[i] = new Array(2);
    }

    for(var i=0;i<8;i++){
        arr640[i][0]=psnrBitrateList[i][0];
        arr640[i][1]=psnrBitrateList[i][1];
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
    arr640 = arr640.sort(function(a,b) {
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
    for(var i = 0; i < arr640.length; i++) {
        for(var z = 0; z < arr640[i].length; z++) {
            console.log("480p "+arr640[i][z]);
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



    /***************Highchart Start**********************/
    var jsdom = require('jsdom');
    var doc = jsdom.jsdom('<!doctype html><html><body><div id="container"></div></body></html>'),
        win = doc.defaultView;

    doc.createElementNS = function (ns, tagName) {
        var elem = doc.createElement(tagName);

        // Set private namespace to satisfy jsdom's getter
        elem._namespaceURI = ns; // eslint-disable-line no-underscore-dangle
        /**
         * Pass Highcharts' test for SVG capabilities
         * @returns {undefined}
         */
        elem.createSVGRect = function () {};
        /**
         * jsdom doesn't compute layout (see https://github.com/tmpvar/jsdom/issues/135).
         * This getBBox implementation provides just enough information to get Highcharts
         * to render text boxes correctly, and is not intended to work like a general
         * getBBox implementation. The height of the boxes are computed from the sum of
         * tspans and their font sizes. The width is based on an average width for each glyph.
         * It could easily be improved to take font-weight into account.
         * For a more exact result we could to create a map over glyph widths for several
         * fonts and sizes, but it may not be necessary for the purpose.
         * @returns {Object} The bounding box
         */
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
    };

    var Highcharts = require('highcharts')(win);

    Highcharts.chart('container', {
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
    var svg = win.document.getElementById('container').innerHTML;
    var chartFile="../resource/HullCharts/"+commonName+".svg";
    fs.writeFile(chartFile, svg, function () {
        console.log('Wrote ' + svg.length + ' bytes to ' +commonName+'.svg.');
    });
    /***************Highchart End*********************/
}

//main function trigerring encoding process
processingInputFile(18,640,480,0);
